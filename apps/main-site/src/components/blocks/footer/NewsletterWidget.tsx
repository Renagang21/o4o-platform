import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

interface NewsletterWidgetProps {
  data?: {
    title?: string;
    description?: string;
    formAction?: string;
    placeholder?: string;
    buttonText?: string;
    successMessage?: string;
    errorMessage?: string;
    customClass?: string;
  };
}

export const NewsletterWidget: React.FC<NewsletterWidgetProps> = ({ data = {} }) => {
  const {
    title = 'Subscribe to Newsletter',
    description = 'Get the latest updates delivered to your inbox',
    formAction = '/api/newsletter/subscribe',
    placeholder = 'Enter your email',
    buttonText = 'Subscribe',
    successMessage = 'Successfully subscribed!',
    errorMessage = 'Failed to subscribe. Please try again.',
    customClass = ''
  } = data;

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${apiUrl}${formAction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setStatus('success');
        setMessage(successMessage);
        setEmail('');
        
        // Reset after 5 seconds
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 5000);
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
      setMessage(errorMessage);
      
      // Reset error after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    }
  };

  return (
    <div className={`footer-widget footer-widget--newsletter ${customClass}`}>
      {title && (
        <h3 className="footer-widget__title">{title}</h3>
      )}
      {description && (
        <p className="footer-newsletter__description">{description}</p>
      )}
      
      <form onSubmit={handleSubmit} className="footer-newsletter">
        <div className="footer-newsletter__field">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            disabled={status === 'loading'}
            className="footer-newsletter__input"
            aria-label="Email address"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="footer-newsletter__button"
            aria-label={buttonText}
          >
            {status === 'loading' ? (
              <div className="footer-newsletter__spinner" />
            ) : (
              <>
                <span className="footer-newsletter__button-text">{buttonText}</span>
                <Send size={16} />
              </>
            )}
          </button>
        </div>
        
        {message && (
          <div className={`footer-newsletter__message footer-newsletter__message--${status}`}>
            {status === 'success' && <CheckCircle size={16} />}
            {status === 'error' && <AlertCircle size={16} />}
            <span>{message}</span>
          </div>
        )}
      </form>
    </div>
  );
};