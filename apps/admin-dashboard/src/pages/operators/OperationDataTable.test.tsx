import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '@o4o/operator-ux-core';
afterEach(cleanup);
it('keeps the default generated checkbox and select-all behavior',()=>{
 const onSelectionChange=vi.fn();render(<DataTable columns={[{key:'label',header:'업무'}]} data={[{id:'one',label:'합성 업무'}]} rowKey="id" selectable selectedKeys={new Set()} onSelectionChange={onSelectionChange}/>);
 expect(screen.getAllByRole('checkbox')).toHaveLength(2);fireEvent.click(screen.getAllByRole('checkbox')[1]);expect(onSelectionChange).toHaveBeenCalledWith(new Set(['one']));
});
it('uses a custom selection column once while retaining the standard select-all header',()=>{
 const onSelectionChange=vi.fn();render(<DataTable columns={[{key:'_select',header:'',system:true,render:()=> <input type="checkbox" aria-label="합성 업무 선택" readOnly checked={false}/>},{key:'label',header:'업무'}]} data={[{id:'one',label:'합성 업무'}]} rowKey="id" selectable selectedKeys={new Set()} onSelectionChange={onSelectionChange}/>);
 expect(screen.getAllByRole('checkbox')).toHaveLength(2);expect(screen.getByLabelText('합성 업무 선택')).toBeTruthy();fireEvent.click(screen.getAllByRole('checkbox')[0]);expect(onSelectionChange).toHaveBeenCalledWith(new Set(['one']));
});
