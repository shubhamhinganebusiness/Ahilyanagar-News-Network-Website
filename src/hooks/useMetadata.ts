import { useEffect } from 'react';
import { News, SiteCustomization, resolveDriveUrl } from '../types';

export function useMetadata(activeArticle: News | null, siteSettings: SiteCustomization) {
  useEffect(() => {
    const updateMetaTag = (attributeName: string, attributeValue: string, contentValue: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue || '');
    };

    if (activeArticle) {
      const cleanDesc = activeArticle.description || activeArticle.content.replace(/<[^>]*>/g, '').slice(0, 150);
      const articleImage = activeArticle.imageURL ? resolveDriveUrl(activeArticle.imageURL) : '';

      document.title = `${activeArticle.title} - ${siteSettings.channelName || 'अहिल्यानगर न्यूज नेटवर्क'}`;

      updateMetaTag('name', 'description', cleanDesc);

      // Keywords
      const tags = [activeArticle.category, ...(activeArticle.tags || [])].filter(Boolean);
      const metaKeywords = tags.join(', ') + ', अहिल्यानगर न्यूज नेटवर्क, महाराष्ट्र न्यूज, मराठी बातम्या';
      updateMetaTag('name', 'keywords', metaKeywords);

      // Open Graph dynamic tags
      updateMetaTag('property', 'og:title', activeArticle.title);
      updateMetaTag('property', 'og:description', cleanDesc);
      updateMetaTag('property', 'og:image', articleImage);
      updateMetaTag('property', 'og:url', window.location.href);
      updateMetaTag('property', 'og:type', 'article');
      updateMetaTag('property', 'og:site_name', siteSettings.channelName || 'अहिल्यानगर न्यूज नेटवर्क');

      // Twitter Card dynamic tags
      updateMetaTag('name', 'twitter:card', 'summary_large_image');
      updateMetaTag('name', 'twitter:title', activeArticle.title);
      updateMetaTag('name', 'twitter:description', cleanDesc);
      updateMetaTag('name', 'twitter:image', articleImage);
    } else {
      // Default Site Settings Metadata
      const siteName = siteSettings.channelName || 'अहिल्यानगर न्यूज नेटवर्क';
      const tagline = siteSettings.channelTagline || 'माझा महाराष्ट्र, माझे पत्र';
      const logoUrl = siteSettings.channelLogoUrl ? resolveDriveUrl(siteSettings.channelLogoUrl) : '';
      const footerAbout = siteSettings.footerAbout || 'महाराष्ट्राचे हक्ताचे व्यासपीठ';

      document.title = siteName;

      updateMetaTag('name', 'description', footerAbout);
      updateMetaTag('name', 'keywords', 'अहिल्यानगर न्यूज नेटवर्क, महाराष्ट्र न्यूज, मराठी बातम्या, ताज्या घडामोडी');

      // Open Graph tags
      updateMetaTag('property', 'og:title', siteName);
      updateMetaTag('property', 'og:description', footerAbout);
      updateMetaTag('property', 'og:image', logoUrl);
      updateMetaTag('property', 'og:url', window.location.origin);
      updateMetaTag('property', 'og:type', 'website');
      updateMetaTag('property', 'og:site_name', siteName);

      // Twitter Card tags
      updateMetaTag('name', 'twitter:card', 'summary_large_image');
      updateMetaTag('name', 'twitter:title', siteName);
      updateMetaTag('name', 'twitter:description', footerAbout);
      updateMetaTag('name', 'twitter:image', logoUrl);
    }
  }, [activeArticle, siteSettings]);
}
