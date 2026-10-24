import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ForumPostContent } from "@o4o/shared-space-ui";
import type { PharmacyManagementClient as Client } from "@o4o/operator-core-ui/modules/pharmacy-management";
import { LoadFeedback, workError } from "./Participation";

type Item = {
  id: string;
  kind: string;
  title: string;
  summary?: string;
  body?: string;
  hidden?: boolean;
};

/** Official publications use the approved business content ledger, never member posts. */
export function CooperativeNews({
  client,
  businessKey,
  slug,
  operator,
  compact = false,
}: Readonly<{
  client: Client;
  businessKey: string;
  slug: string;
  operator: boolean;
  compact?: boolean;
}>) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [params] = useSearchParams();
  const selectedId = compact ? null : params.get("item");
  useEffect(() => {
    let live = true;
    setItems(null);
    setError("");
    const base = operator
      ? "/neture/operator/semi-franchises"
      : "/neture/pharmacy/businesses";
    client
      .get(`${base}/${encodeURIComponent(businessKey)}/showcase`)
      .then((r) => {
        const data = r.data.data;
        if (
          data?.businessKey !== businessKey ||
          !Array.isArray(data.items) ||
          data.items.some(
            (i: Item) =>
              !i ||
              typeof i.id !== "string" ||
              typeof i.title !== "string" ||
              !["product", "content"].includes(i.kind),
          )
        )
          throw new Error();
        if (live)
          setItems(
            data.items.filter((i: Item) => i.kind === "content" && !i.hidden),
          );
      })
      .catch((e) => {
        if (live) setError(workError(e));
      });
    return () => {
      live = false;
    };
  }, [client, businessKey, operator, version]);
  const selected = items?.find((i) => i.id === selectedId);
  const href = (id: string) =>
    `/${encodeURIComponent(slug)}/materials?item=${encodeURIComponent(id)}`;
  return (
    <div className="official-publications">
      <LoadFeedback
        error={error}
        loading={items === null}
        retry={() => setVersion((v) => v + 1)}
      />
      {items &&
        (selectedId ? (
          <>
            <Link
              className="text-link"
              to={`/${encodeURIComponent(slug)}/materials`}
            >
              소식·자료 목록
            </Link>
            {selected ? (
              <article className="card spaced">
                <p className="eyebrow">조합에서 게시한 소식·자료</p>
                <h3>{selected.title}</h3>
                {selected.summary && <p>{selected.summary}</p>}
                {selected.body && <ForumPostContent content={selected.body} />}
              </article>
            ) : (
              <p role="status">현재 공개된 소식·자료를 찾을 수 없습니다.</p>
            )}
          </>
        ) : (
          <>
            {!items.length && <p>게시된 조합 소식·자료가 없습니다.</p>}
            <ul className="publication-list">
              {(compact ? items.slice(0, 3) : items).map((item) => (
                <li key={item.id}>
                  <Link to={href(item.id)}>{item.title}</Link>
                  {item.summary && <p>{item.summary}</p>}
                </li>
              ))}
            </ul>
          </>
        ))}
    </div>
  );
}

/** Small read-only home list; it does not mount a post composer or board editor. */
export function RecentMemberStories({
  client,
  businessKey,
  slug,
}: Readonly<{ client: Client; businessKey: string; slug: string }>) {
  const [posts, setPosts] = useState<{ id: string; title: string }[] | null>(
    null,
  );
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setPosts(null);
    setError("");
    (async () => {
      const business = (
        await client.get(
          `/neture/pharmacy/businesses/${encodeURIComponent(businessKey)}`,
        )
      ).data.data;
      if (
        business?.key !== businessKey ||
        typeof business.communityKey !== "string"
      )
        throw new Error();
      if (!live) return;
      const rows = (
        await client.get(
          `/communities/${encodeURIComponent(business.communityKey)}/forum/posts?page=1&limit=5`,
        )
      ).data.data;
      if (
        !Array.isArray(rows) ||
        rows.some(
          (p) => !p || typeof p.id !== "string" || typeof p.title !== "string",
        )
      )
        throw new Error();
      if (live) setPosts(rows);
    })().catch((e) => {
      if (live) setError(workError(e));
    });
    return () => {
      live = false;
    };
  }, [client, businessKey, version]);
  return (
    <>
      <LoadFeedback
        error={error}
        loading={posts === null}
        retry={() => setVersion((v) => v + 1)}
      />
      {posts?.length === 0 && <p>등록된 조합원 이야기가 없습니다.</p>}
      <ul className="publication-list">
        {posts?.map((post) => (
          <li key={post.id}>
            <Link
              to={`/${encodeURIComponent(slug)}/community?post=${encodeURIComponent(post.id)}`}
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
