import { FC } from 'react';

const Footer: FC = () => {
  return (
    <footer className="w-full bg-gray-800 text-white py-6 mt-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-lg font-bold">yaksa.site</div>
        <div className="text-sm text-gray-300">&copy; {new Date().getFullYear()} yaksa.site. All rights reserved.</div>
        <div className="flex gap-4 text-sm">
          <a href="https://github.com/o4o-dev" target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub</a>
          <a href="mailto:yaksa.site@gmail.com" className="hover:underline">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 