export interface News {
  _id: string;
  title: string;
  slug: string;
  category: 'राष्ट्रीय' | 'राज्य' | 'शहर' | 'क्रीडा' | 'मनोरंजन' | 'अर्थव्यवस्था';
  description: string;
  content: string;
  imageURL: string;
  author: string;
  publishDate: string; // ISO date / formatted string
  views: number;
  videoURL?: string;
  tags?: string[]; // Tagging support
  hidden?: boolean; // Visibility control (hide/unhide)
  authorUsername?: string; // Links article to user account
  scheduledPublishDate?: string; // Future post publication date/time
}

export interface AuthorAccount {
  _id: string;
  username: string;
  password?: string;
  name: string;
  email?: string;
  createdAt?: string;
}

export type CategoryType = 'सर्व' | 'राष्ट्रीय' | 'राज्य' | 'शहर' | 'क्रीडा' | 'मनोरंजन' | 'अर्थव्यवस्था';

export interface BrandAdSlide {
  id: string;
  imageUrl: string;
  linkUrl: string;
  title?: string;
}

export interface AuthorProfile {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  twitterUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  email?: string;
}

export interface SiteCustomization {
  channelName: string;
  channelLogoText: string;
  channelLogoAccentText: string;
  channelTagline: string;
  channelLogoUrl: string;
  footerAbout: string;
  footerAddress: string;
  footerPhone: string;
  footerEmail: string;
  footerCopyrightSub: string;
  breakingNewsText?: string;
  topBarTickerText?: string;
  // New Ads and Live TV Settings
  adBannerEnabled?: boolean;
  adBannerImageUrl?: string;
  adBannerText?: string;
  adBannerLink?: string;
  adBannerBgColor?: string;
  liveTvUrl?: string;

  // Detailed Reading Page Advertisements (4 Ads)
  detailAd1Enabled?: boolean;
  detailAd1ImageUrl?: string;
  detailAd1Link?: string;
  detailAd2Enabled?: boolean;
  detailAd2ImageUrl?: string;
  detailAd2Link?: string;
  detailAd3Enabled?: boolean;
  detailAd3ImageUrl?: string;
  detailAd3Link?: string;
  detailAd4Enabled?: boolean;
  detailAd4ImageUrl?: string;
  detailAd4Link?: string;
  // Brand Ads Slider Customization
  brandAdsEnabled?: boolean;
  brandAdsSlides?: BrandAdSlide[];
  brandAdsTitle?: string;
  brandAdsSubtitle?: string;
  brandAdsInterval?: number;
  
  // Footer Customization
  footerBgColor?: string;
  footerTextColor?: string;
  footerSection1Title?: string;
  footerSection2Title?: string;
  footerSection3Title?: string;
  footerSection4Title?: string;
  footerNewsletterTitle?: string;
  footerNewsletterDesc?: string;
  footerLink1Text?: string;
  footerLink1Url?: string;
  footerLink2Text?: string;
  footerLink2Url?: string;
  footerLink3Text?: string;
  footerLink3Url?: string;
  footerLink4Text?: string;
  footerLink4Url?: string;
  footerLink5Text?: string;
  footerLink5Url?: string;
  footerLink6Text?: string;
  footerLink6Url?: string;

  // Author profiles management
  authorProfiles?: AuthorProfile[];
  recentActivities?: SiteActivityLog[];

  // Google Drive auto-uploads settings
  googleDriveUploadFolderId?: string;
  googleDriveUploadFolderName?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  enableFirebaseStorage?: boolean;
}

export interface SiteActivityLog {
  id: string;
  action: string;
  timestamp: string;
  user: string;
}

export interface AuthUser {
  role: 'superadmin' | 'author' | 'reader';
  username: string;
  name: string;
  email: string;
  token: string;
  photoUrl?: string;
}

export interface Poll {
  _id: string;
  question: string;
  options: string[];
  votes: { [key: string]: number }; // Maps option index as string to vote count (e.g., {"0": 12, "1": 5})
  active: boolean;
  createdAt: string;
  expiryDate?: string; // Optional field for automatic vote closing
  optionImages?: string[]; // Optional images for each option
  randomizeOptions?: boolean; // Whether to randomize options order for voters
}

export interface UserVote {
  _id?: string;
  username: string;
  email: string;
  pollId: string;
  optionIndex: number;
  optionText: string;
  question: string;
  votedAt: string;
}

export interface PollComment {
  _id: string;
  pollId: string;
  username: string;
  name: string;
  email: string;
  photoUrl: string;
  commentText: string;
  createdAt: string;
  upvotes: number;
  upvotedUsers?: string[]; // Array of emails/usernames of users who upvoted
}

export interface SiteNotification {
  _id: string;
  email: string;
  pollId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface SystemLog {
  _id: string;
  action: string;
  details: string;
  userEmail: string;
  timestamp: string;
}

