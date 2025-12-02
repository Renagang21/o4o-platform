import { useState, useEffect } from 'react';

interface Playlist {
  id: string;
  title: string;
  loop: boolean;
}

interface Slide {
  id: string;
  title: string;
  json: any;
  duration: number;
}

interface Schedule {
  startTime: string;
  endTime: string;
  priority: number;
}

interface SignagePlayerProps {
  playlist: Playlist;
  slides: Slide[];
  schedule: Schedule;
}

export function SignagePlayer({ playlist, slides, schedule }: SignagePlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentSlide = slides[currentIndex];

  useEffect(() => {
    if (!isPlaying || !currentSlide) return;

    const duration = currentSlide.duration * 1000; // Convert to milliseconds
    const timer = setTimeout(() => {
      // Move to next slide
      if (currentIndex < slides.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // End of playlist
        if (playlist.loop) {
          setCurrentIndex(0); // Loop back to start
        } else {
          setIsPlaying(false); // Stop playing
        }
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, isPlaying, currentSlide, slides.length, playlist.loop]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    } else if (playlist.loop) {
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (!currentSlide) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-2xl font-bold">No slides to display</p>
          <p className="mt-2 text-gray-400">
            The playlist "{playlist.title}" is empty
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      {/* Main Content Area - ViewRenderer would go here */}
      <div className="h-full w-full flex items-center justify-center">
        {/* Placeholder for ViewRenderer */}
        {/* In production: <ViewRenderer view={currentSlide.json} /> */}
        <div className="text-center text-white p-8">
          <h1 className="text-6xl font-bold mb-4">{currentSlide.title}</h1>
          <p className="text-2xl text-gray-300">Slide {currentIndex + 1} of {slides.length}</p>
          <div className="mt-8 p-6 bg-gray-800 rounded-lg inline-block">
            <p className="text-sm text-gray-400">ViewRenderer Content</p>
            <p className="text-xs text-gray-500 mt-2">
              Slide JSON: {JSON.stringify(currentSlide.json).substring(0, 100)}...
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{
            width: `${((currentIndex + 1) / slides.length) * 100}%`,
          }}
        />
      </div>

      {/* Control Bar (visible on hover) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-4 rounded-full bg-black/80 px-6 py-3 backdrop-blur-sm">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="rounded-full p-2 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            className="rounded-full p-3 text-white hover:bg-white/20"
          >
            {isPlaying ? (
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={!playlist.loop && currentIndex === slides.length - 1}
            className="rounded-full p-2 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="ml-4 text-sm text-white">
            <span className="font-medium">{currentIndex + 1}</span>
            <span className="text-gray-400"> / {slides.length}</span>
          </div>

          <div className="ml-4 text-xs text-gray-400">
            {currentSlide.duration}s
          </div>

          {playlist.loop && (
            <div className="ml-2 rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
              Loop
            </div>
          )}
        </div>
      </div>

      {/* Info Badge (top-right, visible on hover) */}
      <div className="absolute top-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
        <div className="rounded-lg bg-black/80 px-4 py-2 backdrop-blur-sm">
          <p className="text-sm font-medium text-white">{playlist.title}</p>
          <p className="text-xs text-gray-400">
            {schedule.startTime} - {schedule.endTime}
          </p>
        </div>
      </div>
    </div>
  );
}
