import React from "react";

export default function StoreDummy() {
  return (
    <div className="p-4 border rounded bg-white mt-4">
      <h2 className="text-xl font-bold">스토어 구성 (더미)</h2>
      <input className="input" placeholder="스토어명" />
      <textarea className="input" placeholder="메모" />
    </div>
  );
} 