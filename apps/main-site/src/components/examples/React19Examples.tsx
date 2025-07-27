// React 19 새로운 기능들 활용 예시
import { useState, useMemo, forwardRef } from 'react';

// 1. useOptimistic 활용 예시 - 즉시 UI 업데이트
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

async function addTodoAction(text: string): Promise<Todo> {
  // API 호출 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    id: Date.now().toString(),
    text,
    completed: false
  };
}

function OptimisticTodoList() {
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: string) => [
      ...state,
      { id: `temp-${Date.now()}`, text: newTodo, completed: false }
    ]
  );

  const handleAddTodo = async (formData: FormData) => {
    const text = formData.get('text') as string;
    
    // 즉시 낙관적 업데이트
    addOptimisticTodo(text);
    
    try {
      const newTodo = await addTodoAction(text);
      setTodos(prev => [...prev, newTodo]);
    } catch (error: any) {
      // 에러 시 자동으로 이전 상태로 롤백
      console.error('Failed to add todo:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">useOptimistic 예시</h3>
      
      <form action={handleAddTodo} className="mb-4">
        <input
          name="text"
          placeholder="새 할일 추가..."
          className="border p-2 rounded mr-2"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          추가
        </button>
      </form>
      
      <ul className="space-y-2">
        {optimisticTodos.map(todo => (
          <li
            key={todo.id}
            className={`p-2 border rounded ${
              todo.id.startsWith('temp-') ? 'opacity-50' : ''
            }`}
          >
            {todo.text}
            {todo.id.startsWith('temp-') && (
              <span className="text-sm text-gray-500 ml-2">(저장 중...)</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// 2. useActionState 활용 예시 - 폼 상태 관리
interface ContactState {
  status: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
}

async function submitContactForm(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !message) {
    return { status: 'error', message: '모든 필드를 입력해주세요.' };
  }

  // API 호출 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (Math.random() > 0.2) {
    return { status: 'success', message: '문의가 성공적으로 전송되었습니다!' };
  } else {
    return { status: 'error', message: '전송 중 오류가 발생했습니다.' };
  }
}

function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, {
    status: 'idle'
  });

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">useActionState 예시</h3>
      
      <form action={formAction} className="space-y-4">
        <input
          name="name"
          placeholder="이름"
          className="w-full border p-2 rounded"
          disabled={isPending}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="이메일"
          className="w-full border p-2 rounded"
          disabled={isPending}
          required
        />
        <textarea
          name="message"
          placeholder="메시지"
          className="w-full border p-2 rounded h-24"
          disabled={isPending}
          required
        />
        
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
        >
          {isPending ? '전송 중...' : '전송'}
        </button>
        
        {state.message && (
          <div
            className={`p-2 rounded ${
              state.status === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {state.message}
          </div>
        )}
      </form>
    </div>
  );
}

// 3. startTransition 활용 예시 - 우선순위 기반 업데이트
function SearchableList() {
  const [query, setQuery] = React.useState('');
  const [deferredQuery, setDeferredQuery] = React.useState('');
  const [items] = React.useState(
    Array.from({ length: 1000 }, (_, i) => `아이템 ${i + 1}`)
  );

  const filteredItems = React.useMemo(() => {
    return items.filter(item =>
      item.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [items, deferredQuery]);

  const handleSearch = (value: string) => {
    setQuery(value); // 즉시 업데이트 (높은 우선순위)
    
    // 무거운 필터링 작업을 낮은 우선순위로 처리
    startTransition(() => {
      setDeferredQuery(value);
    });
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">startTransition 예시</h3>
      
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="검색..."
        className="w-full border p-2 rounded mb-4"
      />
      
      <div className="h-64 overflow-y-auto space-y-1">
        {filteredItems.slice(0, 50).map(item => (
          <div key={item} className="p-2 border rounded">
            {item}
          </div>
        ))}
      </div>
      
      <p className="text-sm text-gray-500 mt-2">
        {filteredItems.length}개 항목 표시
      </p>
    </div>
  );
}

// 메인 예시 컴포넌트
export default function React19Examples() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        🚀 React 19 새로운 기능 예시
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OptimisticTodoList />
        <ContactForm />
        <SearchableList />
      </div>
      
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">React 19 주요 기능:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>useOptimistic:</strong> 낙관적 업데이트로 즉시 UI 반영</li>
          <li><strong>useActionState:</strong> 폼 상태와 액션 통합 관리</li>
          <li><strong>startTransition:</strong> 업데이트 우선순위 제어</li>
          <li><strong>ref as props:</strong> forwardRef 없이 ref 전달</li>
        </ul>
      </div>
    </div>
  );
}
