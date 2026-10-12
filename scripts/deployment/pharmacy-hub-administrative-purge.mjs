/** PH development-data removal approved by the owner. No commerce/media or identity deletion.
 * Fixed census counts: Actions 38314086152. Unexpected ownership/references stop the transaction.
 */
export class PharmacyHubAdministrativePurge {
    name = 'PharmacyHubAdministrativePurge';
    async up(q, plan = false) {
        if (!q.isTransactionActive)
            throw new Error('PH_PURGE_TRANSACTION_REQUIRED');
        const keys = ['pharmacy-hub', 'pharmacy_hub', 'pharmacy_hub_cart', 'pharmacy-hub-event-offer'];
        const id = (s) => {
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s))
                throw new Error('PH_PURGE_IDENTIFIER');
            return `"${s}"`;
        };
        const ph = (column) => `(${column}::text = ANY($1::text[]) OR left(${column}::text,13) = 'pharmacy-hub:')`;
        const roots = [
            { table: 'action_logs', column: 'service_key', count: 33 },
            { table: 'o4o_event_logs', column: 'service_key', count: 5 },
            { table: 'role_assignments', column: 'role', count: 3 },
            { table: 'service_memberships', column: 'service_key', count: 2 },
            { table: 'user_policy_acceptances', column: 'service_key', count: 2 },
            { table: 'service_policy_documents', column: 'service_key', count: 3 },
            { table: 'service_audience_policies', column: 'service_key', count: 1 },
            { table: 'service_legal_profiles', column: 'service_key', count: 1 },
            { table: 'roles', column: 'service_key', count: 5 },
            { table: 'platform_services', column: 'code', count: 1 },
        ];
        const byTable = new Map(roots.map(r => [r.table, r]));
        await q.query("SET LOCAL lock_timeout = '5s'");
        await q.query("SET LOCAL statement_timeout = '15s'");
        // Freeze root writers/schema before reading dependencies; no FK disabling or implicit cascades.
        await q.query(`LOCK TABLE ${[...byTable.keys(), 'role_permissions'].sort().map(t => `public.${id(t)}`).join(',')} IN ${plan ? "ACCESS SHARE" : "SHARE ROW EXCLUSIVE"} MODE`);
        const fks = await q.query(`
      SELECT sn.nspname AS schema,s.relname AS "table",t.relname AS target,
        array_agg(sa.attname::text ORDER BY k.ordinality) AS source_columns,
        array_agg(ta.attname::text ORDER BY k.ordinality) AS target_columns
      FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid JOIN pg_namespace sn ON sn.oid=s.relnamespace
        JOIN pg_class t ON t.oid=c.confrelid JOIN pg_namespace tn ON tn.oid=t.relnamespace
        CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY k(source_key,target_key,ordinality)
        JOIN pg_attribute sa ON sa.attrelid=c.conrelid AND sa.attnum=k.source_key
        JOIN pg_attribute ta ON ta.attrelid=c.confrelid AND ta.attnum=k.target_key
      WHERE c.contype='f' AND tn.nspname='public' AND t.relname=ANY($1::text[])
      GROUP BY sn.nspname,s.relname,t.relname,c.conname ORDER BY sn.nspname,s.relname,c.conname`, [[...byTable.keys()]]);
        const sources = [...new Set(fks.map(f => `${id(f.schema)}.${id(f.table)}`))].sort();
        if (sources.length)
            await q.query(`LOCK TABLE ${sources.join(',')} IN ${plan ? "ACCESS SHARE" : "SHARE ROW EXCLUSIVE"} MODE`);
        const deleteTriggers = await q.query(`SELECT count(*)::text AS count FROM pg_trigger g
      JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=ANY($1::text[]) AND NOT g.tgisinternal
        AND g.tgenabled<>'D' AND (g.tgtype::int & 8)<>0`, [[...byTable.keys(), 'role_permissions']]);
        if (Number(deleteTriggers[0].count))
            throw new Error('PH_PURGE_UNREVIEWED_DELETE_TRIGGER');
        const count = async (sql) => Number((await q.query(sql, [keys]))[0].count);
        // A PH-looking role must never cause removal of a current-service membership/catalog role.
        for (const [table, column] of [['service_memberships', 'role'], ['roles', 'name']]) {
            if (await count(`SELECT count(*)::text AS count FROM public.${id(table)} WHERE ${ph(id(column))} AND NOT COALESCE(${ph('service_key')},FALSE)`)) {
                throw new Error(`PH_PURGE_MIXED_OWNERSHIP:${table}`);
            }
        }
        for (const r of roots) {
            if (await count(`SELECT count(*)::text AS count FROM public.${id(r.table)} WHERE ${ph(id(r.column))}`) !== r.count) {
                throw new Error(`PH_PURGE_CENSUS_CHANGED:${r.table}`);
            }
        }
        for (const fk of fks) {
            if (!Array.isArray(fk.source_columns) || !Array.isArray(fk.target_columns) ||
                !fk.source_columns.length || fk.source_columns.length !== fk.target_columns.length)
                throw new Error('PH_PURGE_FK_SHAPE');
            const root = byTable.get(fk.target);
            const source = fk.schema === 'public' ? byTable.get(fk.table) : undefined;
            const bridge = fk.schema === 'public' && fk.table === 'role_permissions' && fk.target === 'roles';
            const owned = bridge ? 'TRUE' : source ? ph(`s.${id(source.column)}`) : 'FALSE';
            const join = fk.source_columns.map((c, i) => `s.${id(c)}=p.${id(fk.target_columns[i])}`).join(' AND ');
            if (await count(`SELECT count(*)::text AS count FROM ${id(fk.schema)}.${id(fk.table)} s
        JOIN public.${id(fk.target)} p ON ${join} WHERE ${ph(`p.${id(root.column)}`)} AND NOT COALESCE(${owned},FALSE)`)) {
                throw new Error(`PH_PURGE_SHARED_REFERENCE:${fk.schema}.${fk.table}`);
            }
        }
        if (plan) return { counts: Object.fromEntries(roots.map(r => [r.table, r.count])), applied: false };
        // Catalog permission links belong to their role; permission definitions themselves stay untouched.
        await q.query(`DELETE FROM public.role_permissions rp USING public.roles r
      WHERE rp.role_id=r.id AND ${ph('r.service_key')}`, [keys]);
        for (const r of roots) {
            const deleted = await q.query(`WITH removed AS (DELETE FROM public.${id(r.table)} WHERE ${ph(id(r.column))} RETURNING 1)
        SELECT count(*)::text AS count FROM removed`, [keys]);
            if (Number(deleted[0].count) !== r.count)
                throw new Error(`PH_PURGE_DELETE_COUNT:${r.table}`);
        }
        for (const r of roots) {
            if (await count(`SELECT count(*)::text AS count FROM public.${id(r.table)} WHERE ${ph(id(r.column))}`))
                throw new Error(`PH_PURGE_RESIDUAL:${r.table}`);
        }
    }
}
