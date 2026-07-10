import React from 'react';
import { Mail, Twitter, Facebook, Instagram } from 'lucide-react';
import { AuthorProfile as AuthorProfileType, resolveDriveUrl } from '../types';

interface AuthorProfileProps {
  author: AuthorProfileType;
}

export default function AuthorProfile({ author }: AuthorProfileProps) {
  return (
    <div 
      id={`author-profile-${author.id}`}
      className="mt-8 p-5 sm:p-6 bg-slate-50/60 border border-slate-200/50 rounded-2xl flex flex-col sm:flex-row items-start gap-5 transition-all duration-300 hover:shadow-xs text-slate-800"
    >
      <img 
        src={author.avatarUrl ? resolveDriveUrl(author.avatarUrl) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'} 
        alt={author.name}
        className="w-16 h-16 rounded-full object-cover border border-slate-200/80 shadow-3xs shrink-0"
        referrerPolicy="no-referrer"
      />
      <div className="space-y-2 flex-1 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">लेखक प्रोफाइल (Author Profile)</span>
            <h4 className="text-base font-extrabold text-slate-900">{author.name}</h4>
          </div>
          
          {/* Social Links Panel */}
          <div className="flex items-center space-x-1.5">
            {author.email && (
              <a 
                href={`mailto:${author.email}`}
                className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-lg transition"
                title={author.email}
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
            {author.twitterUrl && (
              <a 
                href={author.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-sky-500 hover:border-sky-200 rounded-lg transition"
                title="Twitter Profile"
              >
                <Twitter className="h-3.5 w-3.5 fill-current" />
              </a>
            )}
            {author.facebookUrl && (
              <a 
                href={author.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition"
                title="Facebook Profile"
              >
                <Facebook className="h-3.5 w-3.5 fill-current" />
              </a>
            )}
            {author.instagramUrl && (
              <a 
                href={author.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 rounded-lg transition"
                title="Instagram Profile"
              >
                <Instagram className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
        {author.bio && (
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
            {author.bio}
          </p>
        )}
      </div>
    </div>
  );
}
