import { FC, useEffect, useState } from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  date: Date;
  summary: string;
}

interface Event {
  id: string;
  title: string;
  location: string;
  date: Date;
  link: string;
  type: 'meetup' | 'wordcamp';
}

/**
 * WordPress Events and News Widget
 */
const AdminNewsWidget: FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'news'>('events');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual WordPress API
  const events: Event[] = [
    {
      id: '1',
      title: 'WordPress Meetup Seoul',
      location: 'Seoul, South Korea',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      link: 'https://www.meetup.com/wordpress-seoul/',
      type: 'meetup'
    },
    {
      id: '2',
      title: 'WordCamp Asia 2025',
      location: 'Bangkok, Thailand',
      date: new Date('2025-02-15'),
      link: 'https://asia.wordcamp.org/2025/',
      type: 'wordcamp'
    },
    {
      id: '3',
      title: 'WordPress Developer Day',
      location: 'Online',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      link: 'https://developer.wordpress.org/',
      type: 'meetup'
    }
  ];

  const news: NewsItem[] = [
    {
      id: '1',
      title: 'WordPress 6.5 Beta 1 Released',
      link: 'https://wordpress.org/news/',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      summary: 'Test the latest features coming to WordPress 6.5 including improved performance and new block editor capabilities.'
    },
    {
      id: '2',
      title: 'State of the Word 2024 Recap',
      link: 'https://wordpress.org/news/',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      summary: 'Matt Mullenweg shares insights on WordPress growth, community contributions, and the roadmap for 2025.'
    },
    {
      id: '3',
      title: 'Gutenberg 17.5 Introduces New Features',
      link: 'https://wordpress.org/news/',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      summary: 'Latest Gutenberg release brings pattern management improvements and enhanced typography controls.'
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const formatEventDate = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div id="dashboard_primary" className="o4o-news-widget">
      <div className="o4o-news-tabs">
        <button
          className={activeTab === 'events' ? 'active' : ''}
          onClick={() => setActiveTab('events')}
        >
          WordPress Events
        </button>
        <button
          className={activeTab === 'news' ? 'active' : ''}
          onClick={() => setActiveTab('news')}
        >
          News
        </button>
      </div>

      <div className="o4o-news-content">
        {isLoading ? (
          <div className="loading-spinner">
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'events' && (
              <div className="events-list">
                <ul className="events">
                  {events.map((event: any) => (
                    <li key={event.id} className={`event event-${event.type}`}>
                      <div className="event-icon">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="event-info">
                        <h4 className="event-title">
                          <a href={event.link} target="_blank" rel="noopener noreferrer">
                            {event.title}
                            <ExternalLink className="w-3 h-3 ml-1 inline" />
                          </a>
                        </h4>
                        <div className="event-meta">
                          <span className="event-date">{formatEventDate(event.date)}</span>
                          <span className="event-location">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                
                <p className="community-events-footer">
                  <a href="https://make.wordpress.org/community/meetups-landing-page" 
                     target="_blank" 
                     rel="noopener noreferrer">
                    Meetups <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  {' | '}
                  <a href="https://central.wordcamp.org/schedule/" 
                     target="_blank" 
                     rel="noopener noreferrer">
                    WordCamps <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  {' | '}
                  <a href="https://wordpress.org/news/" 
                     target="_blank" 
                     rel="noopener noreferrer">
                    News <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="news-list">
                <ul className="news">
                  {news.map((item: any) => (
                    <li key={item.id} className="news-item">
                      <h4 className="news-title">
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          {item.title}
                          <ExternalLink className="w-3 h-3 ml-1 inline" />
                        </a>
                      </h4>
                      <p className="news-summary">{item.summary}</p>
                      <time className="news-date" dateTime={item.date.toISOString()}>
                        {item.date.toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </time>
                    </li>
                  ))}
                </ul>

                <p className="o4o-blog-link">
                  <a href="https://wordpress.org/news/" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="button button-primary">
                    WordPress Blog <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminNewsWidget;