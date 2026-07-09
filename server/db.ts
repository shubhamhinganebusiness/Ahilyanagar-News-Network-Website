import fs from 'fs';
import path from 'path';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  where, 
  limit,
  setLogLevel,
  Firestore as WebFirestore 
} from 'firebase/firestore';
import { News, SiteCustomization, AuthorAccount, Poll, UserVote, PollComment, SiteNotification } from '../src/types';

// Safe date conversion helper
export function safeISOString(date: any): string {
  if (!date) return new Date().toISOString();
  if (typeof date.toISOString === 'function') {
    return date.toISOString();
  }
  const d = new Date(date);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// Seeded Marathi news articles in correct form
const preSeededArticles: News[] = [
  {
    _id: 'seed-1',
    title: 'महाराष्ट्र मंत्रिमंडळाचा मोठा निर्णय: शेतकऱ्यांसाठी नवीन सिंचन योजना जाहीर',
    slug: 'maharashtra-cabinet-new-irrigation-scheme-announced',
    category: 'राज्य',
    description: 'राज्य शासनाने ग्रामीण भागातील कृषी क्षेत्राला बळ देण्यासाठी ५,००0 कोटी रुपयांच्या विशेष पाणी पुरवठा व सिंचन योजनेला मंजुरी दिली आहे.',
    content: `राज्य शासनाने आज झालेल्या मंत्रिमंडळ बैठकीत शेतकऱ्यांसाठी एका अत्यंत महत्त्वपूर्ण आणि ऐतिहासिक योजनेची घोषणा केली आहे. या नवीन सिंचन योजनेद्वारे राज्यातील अवर्षणप्रवण भागातील शेतकऱ्यांना सिंचनासाठी नियमित वीज आणि मुबलक पाणी उपलब्ध करून दिले जाणार आहे.

मुख्यमंत्री आणि उपमुख्यमंत्री यांनी संयुक्त पत्रकार परिषदेत माहिती दिली की, या योजनेसाठी ५,००० कोटी रुपयांची भरीव तरतूद करण्यात आली आहे. प्राथमिक टप्प्यात विदर्भ, मराठवाडा आणि पश्चिम महाराष्ट्रातील दुष्काळी तालुक्यांना प्राधान्य दिले जाईल. यामुळे लाखो हेक्टर शेतजमीन ओलिताखाली येण्यास मदत होणार आहे.

या योजनेच्या अंतर्गत सौर पंप बसवणे, तलाव खोलीकरण आणि लघु कालव्यांचे नूतनीकरण केले जाईल. विरोधी पक्षांनी या भूमिकेचे कौतुक केले असले तरी प्रत्यक्षात कामांची अंमलबजावणी तत्परतेने व्हावी अशी मागणी केली आहे. शेतकरी वर्गातून मात्र या निर्णयाचे जोरदार स्वागत होत आहे.`,
    imageURL: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80',
    author: 'विशेष प्रतिनिधी, मुंबई',
    publishDate: new Date('2026-05-19T10:00:00.000Z').toISOString(),
    views: 145,
    tags: ['कृषी', 'मंत्रिमंडळ', 'महाराष्ट्र'],
    hidden: false,
    authorUsername: 'admin'
  },
  {
    _id: 'seed-2',
    title: 'भारताचे नवीन अंतराळ उड्डाण यश: इस्रोकडून गगनयान चाचणी यशस्वीपणे संपन्न',
    slug: 'india-space-flight-isro-gaganyaan-test-successful',
    category: 'राष्ट्रीय',
    description: 'भारतीय अंतराळ संशोधन संस्था (ISRO) च्या वैज्ञानिकांनी मानवरहित पॅड अबॉर्ट उड्डाण चाचणीत मिळवले मोठे यश.',
    content: `भारताचे स्वतःचे मानवी अंतराळ मोहीम स्वप्न म्हणजेच 'गगनयान' अत्यंत वेगाने प्रत्यक्षात येत आहे. आज पहाटे श्रीहरीकोटा येथील सतीश धवन अंतराळ केंद्रावरून इस्रोने अत्यंत क्लिष्ट अशी पॅड अबॉर्ट चाचणी (Crew Escape System Test) १००% यशस्वी पार पाडली.

या चाचणीच्या माध्यमातून कोणत्याही आपत्कालीन परिस्थितीत अंतराळवीरांचा जीव कसा वाचवला जाईल याचे यशस्वी प्रात्यक्षिक दाखवण्यात आले. रॉकेट हवेत असताना विशिष्ट उंचीवर बिघाड झाल्यास क्रू मॉड्यूल सुरक्षितपणे बाजूला होऊन पॅराशूटच्या साहाय्याने बंगालच्या उपसागरात उतरवण्यात आले.

इस्रोचे अध्यक्ष यांनी या यशानंतर सर्व शास्त्रज्ञांचे अभिनंदन केले. २०२६ मध्ये भारत पहिल्यांदा अंतराळात मनुष्य पाठवण्याची योजना आखत आहे, त्या दृष्टीने आजचे पाऊल अत्यंत महत्त्वाचे ठरले आहे. संपूर्ण देशातून वैज्ञानिकांवर कौतुकाचा वर्षाव होत आहे.`,
    imageURL: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    author: 'विज्ञान वार्ताहर, नवी दिल्ली',
    publishDate: new Date('2026-05-19T06:30:00.000Z').toISOString(),
    views: 290,
    tags: ['इस्रो', 'गगनयान', 'तंत्रज्ञान'],
    hidden: false,
    authorUsername: 'admin'
  },
  {
    _id: 'seed-3',
    title: 'मुंबई मेट्रो ३: कुलाबा-वांद्रे-सीप्झ भुयारी मेट्रोचे आज दिमाखात उद्घाटन',
    slug: 'mumbai-metro-3-colaba-bandra-seepz-inaugurated',
    category: 'शहर',
    description: 'मुंबईकरांचा प्रवास सुसाट होणार! मुंबई मेट्रो लाईन ३ (कुलाबा-वांद्रे-सीप्झ) अखेर प्रवाशांच्या सेवेसाठी सज्ज.',
    content: `मुंबई शहरातील वाहतूक कोंडी आणि लोकल प्रवासातील तोबा गर्दी यावर काही प्रमाणात उतारा देणारी मुंबई मेट्रो लाईन ३ अखेर प्रवाशांच्या सेवेसाठी सज्ज झाली आहे. आज सकाळी पंतप्रधान आणि मुख्यमंत्र्यांच्या हस्ते या भुयारी मेट्रो मार्गिकेला हिरवा कंदिल दाखवण्यात आला.

पहिल्या टप्प्यात आरे कॉलनी ते वांद्रे-कुर्ला संकुल (BKC) यादरम्यान मेट्रो प्रवास सुरू होणार आहे. यामुळे वांद्र्याहून सीप्झला जाण्यासाठी लागणारे ४५ मिनिटे आता अवघ्या १५ मिनिटांत पार करता येतील. मेट्रो स्थानके वातानुकूलित असून अत्यंत आधुनिक सुविधांनी सज्ज आहेत.

मेट्रो ३ च्या उद्घाटनानंतर पहिल्याच दिवशी प्रवाशांनी तुफान गर्दी केली होती. अनेक चाकरमान्यांनी सांगितले की, या भुयारी मेट्रोमुळे त्यांचा प्रवास अतिशय सुकर आणि कमी वेळेचा झाला आहे.`,
    imageURL: 'https://images.unsplash.com/photo-1541417904950-b855846fe074?auto=format&fit=crop&w=800&q=80',
    author: 'मुंबई प्रतिनिधी',
    publishDate: new Date('2026-05-18T05:00:00.000Z').toISOString(),
    views: 312,
    tags: ['मेट्रो', 'मुंबई', 'प्रवास'],
    hidden: false,
    authorUsername: 'admin'
  },
  {
    _id: 'seed-4',
    title: 'भारतीय शेअर बाजार विक्रमी पातळीवर: सेन्सेक्सने ओलांडला ७५,००० चा ऐतिहासिक टप्पा',
    slug: 'indian-stock-market-creates-history-sensex-crosses-75k',
    category: 'अर्थव्यवस्था',
    description: 'भारतीय अर्थव्यवस्थेच्या मजबूत कामगिरीमुळे गुंतवणूकदारांमध्ये प्रचंड उत्साह, परदेशी निधीचा सातत्याने ओघ.',
    content: `गुंतवणूकदारांसाठी आजचा दिवस ऐतिहासिक ठरला. मुंबई शेअर बाजाराचा निर्देशांक सेन्सेक्सने (BSE Sensex) प्रथमच ७५,००० अंकांची विक्रमी पातळी ओलांडली, तर राष्ट्रीय शेअर बाजाराच्या निफ्टीने देखील २२,७०० ची सर्वोच्च पातळी गाठली.

बँकिंग, ऑटोमोबाईल आणि आयटी क्षेत्रातील समभागांची तुफान खरेदी वाढल्यामुळे बाजारात ही तेजी पाहायला मिळाली. आर्थिक तज्ज्ञांच्या मते, भारताचा वाढता जीडीपी दर आणि महागाई नियंत्रणात असल्याने जागतिक गुंतवणूकदारांचा भारतावर प्रचंड विश्वास वाढला आहे.`,
    imageURL: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    author: 'आर्थिक वार्ताहर, मुंबई',
    publishDate: new Date('2026-05-17T11:00:00.000Z').toISOString(),
    views: 312,
    tags: ['शेअर बाजार', 'अर्थव्यवस्था', 'गुंतवणूक'],
    hidden: false,
    authorUsername: 'admin'
  },
  {
    _id: 'seed-5',
    title: 'किल्ला राजगडवर आढळले शिवकालीन ऐतिहासिक अवशेष!',
    slug: 'slug-shivaji-era-remains-found-at-rajgad-fort',
    category: 'राज्य',
    description: 'पुण्यातील ऐतिहासिक राजगड किल्ल्यावर पुरातत्व विभागाच्या उत्खनन दरम्यान शिवकालीन नाणी आणि शस्त्र सापडली.',
    content: `राजगड किल्ल्यावर सुरू असलेल्या विकास कामांच्या दरम्यान पुरातत्व विभागाला काही जुनी भांडी, शिवकालीन तांब्याची नाणी आणि काही धातूची शस्त्रे सापडली आहेत. इतिहास संशोधकांनी घटनास्थळी धाव घेतली असून ही वस्तू सुरक्षितपणे तपासणीसाठी प्रयोगशाळेत पाठवण्यात आल्या आहेत.

इतिहासकारांच्या मते, राजगड ही छत्रपती शिवाजी महाराजांची पहिली राजधानी होती, त्यामुळे या किल्ल्याला अनन्यसाधारण महत्त्व आहे. सापडलेले अवशेष हे त्या वैभवशाली काळाचे साक्षीदार असून यावर अधिक संशोधन केले जाईल. परिसरातील ग्रामस्थांनी या ऐतिहासिक क्षणाचे स्वागत केले आहे.`,
    imageURL: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
    author: 'इतिहास वार्ताहर, सातारा',
    publishDate: new Date('2026-05-17T04:30:00.000Z').toISOString(),
    views: 310,
    tags: ['शिवकाल', 'राजगड', 'इतिहास'],
    hidden: false,
    authorUsername: 'admin'
  }
];

// Error structures conforming to the requested Firestore format
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global Database Manager using Firebase Firestore with transparent local JSON fallback
const defaultSettings: SiteCustomization = {
  channelName: 'माझापत्र',
  channelLogoText: 'माझा',
  channelLogoAccentText: 'पत्र',
  channelTagline: 'माझा महाराष्ट्र, माझे पत्र',
  channelLogoUrl: '',
  footerAbout: 'माझापत्र (MajhaPatra) हे महाराष्ट्रातील अग्रगण्य मराठी न्यूज पोर्टल आहे. आम्ही आपल्यापर्यंत राजकीय, सामाजिक, क्रीडा, मनोरंजन आणि आर्थिक क्षेत्रातील ताज्या व विश्वासार्ह घडामोडी तत्परतेने पोहोचवतो.',
  footerAddress: '१२, नरिमन पॉईंट, मुंबई - ४०००२१, महाराष्ट्र, भारत.',
  footerPhone: '+९१ २२ २४५६ ७८९०',
  footerEmail: 'editor@majhapatra.com',
  footerCopyrightSub: 'महाराष्ट्राचे हक्ताचे व्यासपीठ',
  breakingNewsText: 'महायुती आणि महाविकास आघाडीमध्ये जागावाटपाचा तिढा सुटला; दोन्ही बाजूंकडून उमेदवारांची घोषणा | मुंबई-पुणे एक्सप्रेसवेवर भीषण अपघात, वाहतूक कोंडी | सोन्याच्या दरात घसरण, गुढीपाडव्याच्या पार्श्वभूमीवर ग्राहकांना दिलासा | आयपीएल २०२६: मुंबई इंडियन्सचा शानदार विजय, गुणतालिकेत वरचे स्थान मिळवले',
  topBarTickerText: 'माझापत्र वर ताज्या घडामोडी आणि अचूक बातम्यांचे थेट प्रसार पाहा.',
  adBannerEnabled: true,
  adBannerImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
  adBannerText: 'विशेष जाहिरात ऑफर: आमच्यासोबत जाहिरात करून तुमचा व्यवसाय लाखोंपर्यंत पोहोचवा! संपर्क: +९१ २२ २४५६ ७८९०',
  adBannerLink: '#',
  adBannerBgColor: '#e11d48',
  liveTvUrl: 'https://www.youtube.com/watch?v=yW6I1y8Jt4w',
  detailAd1Enabled: true,
  detailAd1ImageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80',
  detailAd1Link: '#',
  detailAd2Enabled: true,
  detailAd2ImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  detailAd2Link: '#',
  detailAd3Enabled: true,
  detailAd3ImageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
  detailAd3Link: '#',
  detailAd4Enabled: true,
  detailAd4ImageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
  detailAd4Link: '#',
  brandAdsEnabled: true,
  brandAdsSlides: [
    {
      id: 'slide-1',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      linkUrl: '#',
      title: 'आमच्या न्यूज पोर्टलवर जाहिरात प्रसिद्ध करा व कोट्यवधी वाचकांपर्यंत पोहोचा!'
    },
    {
      id: 'slide-2',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      linkUrl: '#',
      title: 'विशेष औद्योगिक जाहिरात: उद्योजक आणि व्यावसायिकांसाठी उत्तम माध्यम'
    }
  ],
  brandAdsTitle: 'विशेष जाहिरात दालन',
  brandAdsSubtitle: 'आमच्या न्यूज पोर्टलवर आपल्या व्यवसायाची जाहिरात करा',
  brandAdsInterval: 5,
  footerBgColor: '#0f172a',
  footerTextColor: '#e2e8f0',
  footerSection1Title: 'Categories',
  footerSection2Title: 'Quick Links',
  footerSection3Title: 'Contact Us',
  footerSection4Title: 'Newsletter',
  footerNewsletterTitle: 'साप्ताहिक वृत्तांत',
  footerNewsletterDesc: 'आमच्या ईमेल यादीत सामील व्हा आणि ताज्या घडामोडी थेट तुमच्या इनबॉक्समध्ये मिळवा.',
  footerLink1Text: 'आमच्याबद्दल',
  footerLink1Url: '#',
  footerLink2Text: 'जाहिरात दर',
  footerLink2Url: '#',
  footerLink3Text: 'संपर्क साधा',
  footerLink3Url: '#',
  footerLink4Text: 'गोपनीयता धोरण',
  footerLink4Url: '#',
  footerLink5Text: 'नियम आणि अटी',
  footerLink5Url: '#',
  footerLink6Text: 'करिअर संधी',
  footerLink6Url: '#',
  authorProfiles: [
    {
      id: 'author-1',
      name: 'विशेष प्रतिनिधी, मुंबई',
      bio: 'महाराष्ट्राच्या आणि विशेषतः मुंबईच्या राजकीय व सामाजिक घडामोडींचे सुक्ष्म विश्लेषण करणारे ज्येष्ठ बातमीदार.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      twitterUrl: 'https://twitter.com/majhapatra',
      facebookUrl: 'https://facebook.com/majhapatra',
      email: 'mumbai@majhapatra.com'
    },
    {
      id: 'author-2',
      name: 'विज्ञान वार्ताहर, नवी दिल्ली',
      bio: 'भारतीय अंतराळ संशोधन (ISRO) आणि जागतिक वैज्ञानिक तंत्रज्ञानावरील घडामोडी वाचकांपर्यंत सोप्या भाषेत मांडणारे ज्येष्ठ लेखक.',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      twitterUrl: 'https://twitter.com/majhapatra_sci',
      email: 'science@majhapatra.com'
    },
    {
      id: 'author-3',
      name: 'क्रीडा प्रतिनिधी, मेलबर्न',
      bio: 'क्रिकेट, फुटबॉल आणि राष्ट्रीय-आंतरराष्ट्रीय पातळीवरील सर्व क्रीडा क्षेत्रांचे विशेष विश्लेषण करणारे क्रीडाप्रेमी लेखक.',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80',
      twitterUrl: 'https://twitter.com/majhapatra_sports',
      email: 'sports@majhapatra.com'
    }
  ]
};

export class PortalDatabase {
  private app!: FirebaseApp;
  private firestore!: WebFirestore;
  private useFallback = false;

  private checkIfFallbackNeeded(err: any): boolean {
    const errMsg = String(err?.message || err || 'Unknown Firestore Error');
    if (!this.useFallback) {
      console.warn(`Firestore error or offline state detected ("${errMsg}"). Enabling seamless local file fallback.`);
      this.useFallback = true;
    }
    return true;
  }

  private getLocalNews(): News[] {
    const filePath = path.join(process.cwd(), 'data/news.json');
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(preSeededArticles, null, 2), 'utf-8');
      return preSeededArticles;
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return preSeededArticles;
    }
  }

  private saveLocalNews(list: News[]) {
    const filePath = path.join(process.cwd(), 'data/news.json');
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  private getLocalSettings(): SiteCustomization {
    const filePath = path.join(process.cwd(), 'data/settings.json');
    if (!fs.existsSync(filePath)) {
      return defaultSettings;
    }
    try {
      return { ...defaultSettings, ...JSON.parse(fs.readFileSync(filePath, 'utf-8')) };
    } catch (e) {
      return defaultSettings;
    }
  }

  private saveLocalSettings(settings: SiteCustomization) {
    try {
      const filePath = path.join(process.cwd(), 'data/settings.json');
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write settings to local data/settings.json (filesystem may be read-only):', e);
    }
  }

  private getLocalAuthors(): AuthorAccount[] {
    const filePath = path.join(process.cwd(), 'data/authors.json');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private saveLocalAuthors(list: AuthorAccount[]) {
    const filePath = path.join(process.cwd(), 'data/authors.json');
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  private getLocalLogs(): any[] {
    const filePath = path.join(process.cwd(), 'data/logs.json');
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private saveLocalLogs(list: any[]) {
    const filePath = path.join(process.cwd(), 'data/logs.json');
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  }


  async initialize() {
    console.log('Initializing Firebase Firestore Web SDK connection in database module...');
    
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let firebaseConfig: any;

    const fallbackConfig = {
      "projectId": "gen-lang-client-0237037046",
      "appId": "1:1048690632738:web:61965414bcdeb5cb04c27b",
      "apiKey": "AIzaSyCYLx7EMq1usfcBBQWP9gC8CvONHQEXa7Q",
      "authDomain": "gen-lang-client-0237037046.firebaseapp.com",
      "firestoreDatabaseId": "ai-studio-remixremixmajhap-e87cdb36-28bc-4662-b9cc-e404deca17c2",
      "storageBucket": "gen-lang-client-0237037046.firebasestorage.app",
      "messagingSenderId": "1048690632738",
      "measurementId": "",
      "oAuthClientId": "1048690632738-5mpjv14t8bhc8cohb31in5ib417nropi.apps.googleusercontent.com"
    };

    if (fs.existsSync(firebaseConfigPath)) {
      try {
        firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
        if (firebaseConfig.projectId && firebaseConfig.projectId.startsWith('remixed-')) {
          console.log('Detected placeholder config in firebase-applet-config.json, using fallback configuration.');
          firebaseConfig = fallbackConfig;
        }
      } catch (err) {
        console.warn('Error reading firebase-applet-config.json, using fallback:', err);
        firebaseConfig = fallbackConfig;
      }
    } else {
      console.log('firebase-applet-config.json not found, using fallback configuration.');
      firebaseConfig = fallbackConfig;
    }

    try {
      setLogLevel('silent');
      this.app = initializeApp(firebaseConfig);
      this.firestore = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);

      // Test connectivity with a 3-second timeout to prevent startup hangs on Cloud Run
      const testPromise = getDocs(query(collection(this.firestore, 'news'), limit(1)));
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Firestore connectivity test timed out (3000ms)')), 3000)
      );

      const snap = await Promise.race([testPromise, timeoutPromise]);
      
      if (snap.empty) {
        console.log('Firestore is empty. Seeding initial Marathi articles...');
        for (const article of preSeededArticles) {
          const { _id, ...rest } = article;
          await setDoc(doc(this.firestore, 'news', _id), rest);
        }
        console.log('Seeding initial news completed successfully!');
      } else {
        console.log('Firestore already contains news data. Skipping seed.');
      }

      // Check for default site settings doc
      const settingsSnap = await getDoc(doc(this.firestore, 'settings', 'site'));
      if (!settingsSnap.exists()) {
        console.log('Default site settings not found. Saving defaults...');
        await this.getSettings();
      }
    } catch (err: any) {
      console.info('Firestore database is offline or lacks server-side IAM permissions. Activating local JSON fallback:', err.message || err);
      this.useFallback = true;
    }
  }

  async getAll(category?: string, search?: string, includeHidden: boolean = false, authorUsername?: string): Promise<News[]> {
    if (this.useFallback) {
      let list = this.getLocalNews();
      if (!includeHidden) {
        list = list.filter(item => !item.hidden && (!item.scheduledPublishDate || new Date(item.scheduledPublishDate).getTime() <= Date.now()));
      }
      if (category && category !== 'सर्व') {
        list = list.filter(item => item.category === category);
      }
      if (authorUsername) {
        if (authorUsername === 'admin') {
          list = list.filter(item => item.authorUsername === 'admin' || !item.authorUsername);
        } else {
          list = list.filter(item => item.authorUsername === authorUsername);
        }
      }
      if (search) {
        const queryLower = search.toLowerCase();
        list = list.filter(item => 
          item.title.toLowerCase().includes(queryLower) ||
          item.description.toLowerCase().includes(queryLower) ||
          item.content.toLowerCase().includes(queryLower) ||
          item.author.toLowerCase().includes(queryLower) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(queryLower)))
        );
      }
      return list.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
    }

    try {
      const snap = await getDocs(collection(this.firestore, 'news'));
      let list: News[] = snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          title: data.title,
          slug: data.slug,
          category: data.category,
          description: data.description,
          content: data.content,
          imageURL: data.imageURL,
          author: data.author,
          publishDate: safeISOString(data.publishDate),
          views: data.views || 0,
          videoURL: data.videoURL,
          tags: data.tags || [],
          hidden: !!data.hidden,
          authorUsername: data.authorUsername || 'admin',
          scheduledPublishDate: data.scheduledPublishDate || '',
        } as News;
      });

      // Filter in-memory to prevent complex Firestore compound index errors
      if (!includeHidden) {
        list = list.filter(item => !item.hidden && (!item.scheduledPublishDate || new Date(item.scheduledPublishDate).getTime() <= Date.now()));
      }
      if (category && category !== 'सर्व') {
        list = list.filter(item => item.category === category);
      }
      if (authorUsername) {
        if (authorUsername === 'admin') {
          list = list.filter(item => item.authorUsername === 'admin' || !item.authorUsername);
        } else {
          list = list.filter(item => item.authorUsername === authorUsername);
        }
      }
      if (search) {
        const queryLower = search.toLowerCase();
        list = list.filter(item => 
          item.title.toLowerCase().includes(queryLower) ||
          item.description.toLowerCase().includes(queryLower) ||
          item.content.toLowerCase().includes(queryLower) ||
          item.author.toLowerCase().includes(queryLower) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(queryLower)))
        );
      }

      return list.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getAll(category, search, includeHidden, authorUsername);
      }
      handleFirestoreError(err, OperationType.LIST, 'news');
      return [];
    }
  }

  async getById(id: string): Promise<News | null> {
    if (this.useFallback) {
      const list = this.getLocalNews();
      const item = list.find(x => x._id === id);
      if (!item) return null;
      item.views = (item.views || 0) + 1;
      this.saveLocalNews(list);
      return item;
    }

    try {
      const docRef = doc(this.firestore, 'news', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data()!;
      const currentViews = (data.views || 0) + 1;
      
      // Increment views
      await updateDoc(docRef, { views: currentViews });
      
      return {
        _id: docSnap.id,
        title: data.title,
        slug: data.slug,
        category: data.category,
        description: data.description,
        content: data.content,
        imageURL: data.imageURL,
        author: data.author,
        publishDate: safeISOString(data.publishDate),
        views: currentViews,
        videoURL: data.videoURL,
        tags: data.tags || [],
        hidden: !!data.hidden,
        authorUsername: data.authorUsername || 'admin',
        scheduledPublishDate: data.scheduledPublishDate || '',
      } as News;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getById(id);
      }
      handleFirestoreError(err, OperationType.GET, `news/${id}`);
      return null;
    }
  }

  async create(data: Omit<News, '_id' | 'publishDate' | 'views'>): Promise<News> {
    const slug = data.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (this.useFallback) {
      const list = this.getLocalNews();
      const newsItem: News = {
        _id: 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: data.title,
        slug,
        category: data.category,
        description: data.description,
        content: data.content,
        imageURL: data.imageURL,
        author: data.author,
        publishDate: new Date().toISOString(),
        views: 0,
        videoURL: data.videoURL || '',
        tags: data.tags || [],
        hidden: !!data.hidden,
        authorUsername: data.authorUsername || 'admin',
        scheduledPublishDate: data.scheduledPublishDate || '',
      };
      list.push(newsItem);
      this.saveLocalNews(list);
      return newsItem;
    }

    try {
      const publishDate = new Date().toISOString();
      const newsData = {
        title: data.title,
        slug,
        category: data.category,
        description: data.description,
        content: data.content,
        imageURL: data.imageURL,
        author: data.author,
        publishDate,
        views: 0,
        videoURL: data.videoURL || '',
        tags: data.tags || [],
        hidden: !!data.hidden,
        authorUsername: data.authorUsername || 'admin',
        scheduledPublishDate: data.scheduledPublishDate || '',
      };

      const docRef = await addDoc(collection(this.firestore, 'news'), newsData);
      return {
        _id: docRef.id,
        ...newsData
      } as News;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.create(data);
      }
      handleFirestoreError(err, OperationType.CREATE, 'news');
      throw err;
    }
  }

  async update(id: string, data: Partial<News>): Promise<News | null> {
    if (this.useFallback) {
      const list = this.getLocalNews();
      const index = list.findIndex(x => x._id === id);
      if (index === -1) return null;
      const current = list[index];
      const updated: News = {
        ...current,
        ...data,
        _id: id
      };
      if (data.title) {
        updated.slug = data.title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      list[index] = updated;
      this.saveLocalNews(list);
      return updated;
    }

    try {
      const docRef = doc(this.firestore, 'news', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;

      const updateData: any = { ...data };
      if (data.title) {
        updateData.slug = data.title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      delete updateData._id;

      await updateDoc(docRef, updateData);
      
      const finalSnap = await getDoc(docRef);
      const finalData = finalSnap.data()!;
      return {
        _id: id,
        title: finalData.title,
        slug: finalData.slug,
        category: finalData.category,
        description: finalData.description,
        content: finalData.content,
        imageURL: finalData.imageURL,
        author: finalData.author,
        publishDate: safeISOString(finalData.publishDate),
        views: finalData.views || 0,
        videoURL: finalData.videoURL,
        tags: finalData.tags || [],
        hidden: !!finalData.hidden,
        authorUsername: finalData.authorUsername || 'admin',
        scheduledPublishDate: finalData.scheduledPublishDate || '',
      } as News;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.update(id, data);
      }
      handleFirestoreError(err, OperationType.UPDATE, `news/${id}`);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    if (this.useFallback) {
      const list = this.getLocalNews();
      const index = list.findIndex(x => x._id === id);
      if (index === -1) return false;
      list.splice(index, 1);
      this.saveLocalNews(list);
      return true;
    }

    try {
      const docRef = doc(this.firestore, 'news', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return false;
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.delete(id);
      }
      handleFirestoreError(err, OperationType.DELETE, `news/${id}`);
      return false;
    }
  }

  async getSettings(): Promise<SiteCustomization> {
    const local = this.getLocalSettings();
    if (this.useFallback) {
      return local;
    }

    try {
      const docRef = doc(this.firestore, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        
        // Merge intelligently: prioritize non-empty custom values, and prioritize firestoreData as the central db
        const merged = { ...defaultSettings };
        const allKeys = Array.from(new Set([
          ...Object.keys(defaultSettings),
          ...Object.keys(local),
          ...Object.keys(firestoreData)
        ])) as Array<keyof SiteCustomization>;

        for (const key of allKeys) {
          const defaultVal = defaultSettings[key];
          const localVal = local[key];
          const firestoreVal = firestoreData[key];

          // Check if values are custom (different from default settings and not empty)
          // Note: for channelLogoUrl, we also treat "/logo.jpg" as a default/non-custom value
          const isLocalCustom = localVal !== undefined && localVal !== null && localVal !== '' && localVal !== defaultVal && (key !== 'channelLogoUrl' || localVal !== '/logo.jpg');
          const isFirestoreCustom = firestoreVal !== undefined && firestoreVal !== null && firestoreVal !== '' && firestoreVal !== defaultVal && (key !== 'channelLogoUrl' || firestoreVal !== '/logo.jpg');

          if (isLocalCustom && !isFirestoreCustom) {
            (merged as any)[key] = localVal;
          } else if (isFirestoreCustom && !isLocalCustom) {
            (merged as any)[key] = firestoreVal;
          } else if (isLocalCustom && isFirestoreCustom) {
            const isLocalUpload = typeof localVal === 'string' && (localVal.startsWith('/uploads/') || localVal.includes('googleusercontent.com') || localVal.includes('drive.google.com'));
            const isFirestoreUpload = typeof firestoreVal === 'string' && (firestoreVal.startsWith('/uploads/') || firestoreVal.includes('googleusercontent.com') || firestoreVal.includes('drive.google.com'));

            if (isLocalUpload && !isFirestoreUpload) {
              (merged as any)[key] = localVal;
            } else if (isFirestoreUpload && !isLocalUpload) {
              (merged as any)[key] = firestoreVal;
            } else {
              (merged as any)[key] = firestoreVal;
            }
          } else {
            (merged as any)[key] = firestoreVal !== undefined ? firestoreVal : (localVal !== undefined ? localVal : defaultVal);
          }
        }
        
        // Sync local-first changes (like uploaded logo URL) back to Firestore if they differ
        const isDifferent = JSON.stringify(firestoreData) !== JSON.stringify(merged);
        if (isDifferent) {
          console.log('Syncing local-first settings to Firestore...');
          await setDoc(docRef, merged);
        }
        
        // Save merged to local file cache
        this.saveLocalSettings(merged);
        return merged;
      } else {
        await setDoc(docRef, local);
        return local;
      }
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getSettings();
      }
      handleFirestoreError(err, OperationType.GET, 'settings/site');
      return local;
    }
  }

  async updateSettings(data: Partial<SiteCustomization>): Promise<SiteCustomization> {
    if (this.useFallback) {
      const current = this.getLocalSettings();
      const updated = { ...current, ...data };
      this.saveLocalSettings(updated);
      return updated;
    }

    try {
      const docRef = doc(this.firestore, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      const current = docSnap.exists() ? docSnap.data()! : await this.getSettings();
      const updated = { ...current, ...data };
      await setDoc(docRef, updated);
      
      // Always keep local file completely in sync
      this.saveLocalSettings(updated as SiteCustomization);
      return updated as SiteCustomization;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.updateSettings(data);
      }
      handleFirestoreError(err, OperationType.UPDATE, 'settings/site');
      return await this.getSettings();
    }
  }

  async createLog(action: string, details: string, userEmail: string): Promise<any> {
    const logItem = {
      action,
      details,
      userEmail: userEmail || 'unknown@majhapatra.com',
      timestamp: new Date().toISOString(),
    };

    if (this.useFallback) {
      const list = this.getLocalLogs();
      const id = 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const newLog = { _id: id, ...logItem };
      list.push(newLog);
      if (list.length > 200) {
        list.shift();
      }
      this.saveLocalLogs(list);
      return newLog;
    }

    try {
      const docRef = await addDoc(collection(this.firestore, 'logs'), logItem);
      return { _id: docRef.id, ...logItem };
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.createLog(action, details, userEmail);
      }
      handleFirestoreError(err, OperationType.CREATE, 'logs');
      throw err;
    }
  }

  async getLogs(): Promise<any[]> {
    if (this.useFallback) {
      const list = this.getLocalLogs();
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    try {
      const snap = await getDocs(collection(this.firestore, 'logs'));
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          action: data.action,
          details: data.details,
          userEmail: data.userEmail || 'unknown@majhapatra.com',
          timestamp: safeISOString(data.timestamp),
        };
      });
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getLogs();
      }
      handleFirestoreError(err, OperationType.LIST, 'logs');
      return [];
    }
  }

  async getAuthors(): Promise<AuthorAccount[]> {
    if (this.useFallback) {
      return this.getLocalAuthors();
    }

    try {
      const snap = await getDocs(collection(this.firestore, 'authors'));
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          username: data.username,
          password: data.password,
          name: data.name,
          email: data.email || '',
          createdAt: safeISOString(data.createdAt)
        };
      });
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getAuthors();
      }
      handleFirestoreError(err, OperationType.LIST, 'authors');
      return [];
    }
  }

  async getAuthorByUsername(username: string): Promise<AuthorAccount | null> {
    const lowerUsername = username.toLowerCase().trim();
    if (this.useFallback) {
      const list = this.getLocalAuthors();
      const author = list.find(x => x.username === lowerUsername);
      return author || null;
    }

    try {
      const snap = await getDocs(query(collection(this.firestore, 'authors'), where('username', '==', lowerUsername)));
      if (snap.empty) return null;
      const document = snap.docs[0];
      const data = document.data();
      return {
        _id: document.id,
        username: data.username,
        password: data.password,
        name: data.name,
        email: data.email || '',
        createdAt: safeISOString(data.createdAt)
      };
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getAuthorByUsername(username);
      }
      handleFirestoreError(err, OperationType.GET, `authors/${lowerUsername}`);
      return null;
    }
  }

  async createAuthor(data: Omit<AuthorAccount, '_id' | 'createdAt'>): Promise<AuthorAccount> {
    const lowerUsername = data.username.toLowerCase().trim();
    if (this.useFallback) {
      const list = this.getLocalAuthors();
      const newAuthor: AuthorAccount = {
        _id: 'local-author-' + Date.now(),
        username: lowerUsername,
        password: data.password,
        name: data.name,
        email: data.email || '',
        createdAt: new Date().toISOString()
      };
      list.push(newAuthor);
      this.saveLocalAuthors(list);
      return newAuthor;
    }

    try {
      const authorData = {
        username: lowerUsername,
        password: data.password,
        name: data.name,
        email: data.email || '',
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(this.firestore, 'authors'), authorData);
      return {
        _id: docRef.id,
        ...authorData
      };
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.createAuthor(data);
      }
      handleFirestoreError(err, OperationType.CREATE, 'authors');
      throw err;
    }
  }

  async deleteAuthor(id: string): Promise<boolean> {
    if (this.useFallback) {
      const list = this.getLocalAuthors();
      const index = list.findIndex(x => x._id === id);
      if (index === -1) return false;
      list.splice(index, 1);
      this.saveLocalAuthors(list);
      return true;
    }

    try {
      const docRef = doc(this.firestore, 'authors', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return false;
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.deleteAuthor(id);
      }
      handleFirestoreError(err, OperationType.DELETE, `authors/${id}`);
      return false;
    }
  }

  async saveUpload(filename: string, contentType: string, base64Data: string): Promise<boolean> {
    if (this.useFallback) return false;
    try {
      await setDoc(doc(this.firestore, 'uploads', filename), {
        filename,
        contentType,
        data: base64Data,
        createdAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('Error saving upload to Firestore:', err);
      return false;
    }
  }

  async getUpload(filename: string): Promise<{ contentType: string; data: string } | null> {
    if (this.useFallback) return null;
    try {
      const docSnap = await getDoc(doc(this.firestore, 'uploads', filename));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          contentType: data.contentType || 'image/jpeg',
          data: data.data
        };
      }
      return null;
    } catch (err) {
      console.error('Error getting upload from Firestore:', err);
      return null;
    }
  }

  private getLocalAnalytics(): any[] {
    const filePath = path.join(process.cwd(), 'data/analytics.json');
    if (!fs.existsSync(filePath)) {
      const seeded = this.generateSeededAnalytics();
      fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2), 'utf-8');
      return seeded;
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return this.generateSeededAnalytics();
    }
  }

  private saveLocalAnalytics(list: any[]) {
    const filePath = path.join(process.cwd(), 'data/analytics.json');
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  private generateSeededAnalytics(): any[] {
    const list: any[] = [];
    const now = new Date();
    // Generate last 10 days of seeded data
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const factor = Math.sin((10 - i) * 0.8) * 40 + 150;
      list.push({
        date: dateStr,
        visitors: Math.round(factor + Math.random() * 20),
        views: Math.round(factor * 2.5 + Math.random() * 50)
      });
    }
    return list;
  }

  async recordVisit(): Promise<void> {
    const dateStr = new Date().toISOString().split('T')[0];
    if (this.useFallback) {
      const list = this.getLocalAnalytics();
      let docObj = list.find(x => x.date === dateStr);
      if (!docObj) {
        docObj = { date: dateStr, visitors: 1, views: 1 };
        list.push(docObj);
      } else {
        docObj.views = (docObj.views || 0) + 1;
        if (Math.random() > 0.4) {
          docObj.visitors = (docObj.visitors || 0) + 1;
        }
      }
      this.saveLocalAnalytics(list);
      return;
    }

    try {
      const docRef = doc(this.firestore, 'analytics', dateStr);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const views = (data.views || 0) + 1;
        let visitors = data.visitors || 0;
        if (Math.random() > 0.4) {
          visitors += 1;
        }
        await updateDoc(docRef, { views, visitors });
      } else {
        await setDoc(docRef, {
          date: dateStr,
          views: 1,
          visitors: 1
        });
      }
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.recordVisit();
      }
      console.error('Failed to record visit:', err);
    }
  }

  async getAnalytics(): Promise<any[]> {
    if (this.useFallback) {
      return this.getLocalAnalytics();
    }

    try {
      const snap = await getDocs(collection(this.firestore, 'analytics'));
      let list: any[] = snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          date: data.date || doc.id,
          visitors: data.visitors || 0,
          views: data.views || 0
        };
      });

      if (list.length === 0) {
        const seeded = this.generateSeededAnalytics();
        for (const item of seeded) {
          await setDoc(doc(this.firestore, 'analytics', item.date), {
            date: item.date,
            visitors: item.visitors,
            views: item.views
          });
        }
        return seeded;
      }

      return list.sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getAnalytics();
      }
      handleFirestoreError(err, OperationType.LIST, 'analytics');
      return [];
    }
  }

  private getLocalPolls(): Poll[] {
    const filePath = path.join(process.cwd(), 'data/polls.json');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private saveLocalPolls(list: Poll[]) {
    const filePath = path.join(process.cwd(), 'data/polls.json');
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  async getPolls(): Promise<Poll[]> {
    if (this.useFallback) {
      return this.getLocalPolls().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    try {
      const snap = await getDocs(collection(this.firestore, 'polls'));
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          question: data.question || '',
          options: data.options || [],
          votes: data.votes || {},
          active: !!data.active,
          createdAt: safeISOString(data.createdAt),
          expiryDate: data.expiryDate || undefined,
          optionImages: data.optionImages || undefined,
          randomizeOptions: data.randomizeOptions !== undefined ? !!data.randomizeOptions : false
        } as Poll;
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getPolls();
      }
      handleFirestoreError(err, OperationType.LIST, 'polls');
      return [];
    }
  }

  async createPoll(question: string, options: string[], expiryDate?: string, optionImages?: string[], randomizeOptions?: boolean): Promise<Poll> {
    const defaultVotes: { [key: string]: number } = {};
    options.forEach((_, idx) => {
      defaultVotes[String(idx)] = 0;
    });

    if (this.useFallback) {
      const list = this.getLocalPolls();
      list.forEach(p => { p.active = false; });
      const newPoll: Poll = {
        _id: 'local-poll-' + Date.now(),
        question,
        options,
        votes: defaultVotes,
        active: true,
        createdAt: new Date().toISOString(),
        expiryDate: expiryDate || undefined,
        optionImages: optionImages || undefined,
        randomizeOptions: randomizeOptions || false
      };
      list.push(newPoll);
      this.saveLocalPolls(list);
      return newPoll;
    }

    try {
      const existingPolls = await this.getPolls();
      for (const p of existingPolls) {
        if (p.active) {
          await updateDoc(doc(this.firestore, 'polls', p._id), { active: false });
        }
      }

      const pollData: any = {
        question,
        options,
        votes: defaultVotes,
        active: true,
        createdAt: new Date().toISOString(),
        randomizeOptions: randomizeOptions || false
      };
      if (expiryDate) {
        pollData.expiryDate = expiryDate;
      }
      if (optionImages) {
        pollData.optionImages = optionImages;
      }
      const docRef = await addDoc(collection(this.firestore, 'polls'), pollData);
      return {
        _id: docRef.id,
        ...pollData
      };
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.createPoll(question, options, expiryDate, optionImages, randomizeOptions);
      }
      handleFirestoreError(err, OperationType.CREATE, 'polls');
      throw err;
    }
  }

  async votePoll(pollId: string, optionIndex: string): Promise<boolean> {
    if (this.useFallback) {
      const list = this.getLocalPolls();
      const poll = list.find(p => p._id === pollId);
      if (!poll) return false;
      if (poll.expiryDate && new Date() > new Date(poll.expiryDate)) {
        throw new Error('हा पोल कालबाह्य (expired) झाला आहे.');
      }
      if (!poll.votes) poll.votes = {};
      poll.votes[optionIndex] = (poll.votes[optionIndex] || 0) + 1;
      this.saveLocalPolls(list);
      return true;
    }

    try {
      const docRef = doc(this.firestore, 'polls', pollId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return false;
      const data = docSnap.data();
      if (data.expiryDate && new Date() > new Date(data.expiryDate)) {
        throw new Error('हा पोल कालबाह्य (expired) झाला आहे.');
      }
      const votes = data.votes || {};
      votes[optionIndex] = (votes[optionIndex] || 0) + 1;
      await updateDoc(docRef, { votes });
      return true;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.votePoll(pollId, optionIndex);
      }
      handleFirestoreError(err, OperationType.UPDATE, `polls/${pollId}`);
      return false;
    }
  }

  async deletePoll(pollId: string): Promise<boolean> {
    if (this.useFallback) {
      const list = this.getLocalPolls();
      const index = list.findIndex(p => p._id === pollId);
      if (index === -1) return false;
      list.splice(index, 1);
      this.saveLocalPolls(list);
      return true;
    }

    try {
      const docRef = doc(this.firestore, 'polls', pollId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.deletePoll(pollId);
      }
      handleFirestoreError(err, OperationType.DELETE, `polls/${pollId}`);
      return false;
    }
  }

  async togglePollActive(pollId: string, active: boolean): Promise<boolean> {
    if (this.useFallback) {
      const list = this.getLocalPolls();
      if (active) {
        list.forEach(p => { p.active = false; });
      }
      const poll = list.find(p => p._id === pollId);
      if (!poll) return false;
      poll.active = active;
      this.saveLocalPolls(list);
      return true;
    }

    try {
      if (active) {
        const existingPolls = await this.getPolls();
        for (const p of existingPolls) {
          if (p.active && p._id !== pollId) {
            await updateDoc(doc(this.firestore, 'polls', p._id), { active: false });
          }
        }
      }
      await updateDoc(doc(this.firestore, 'polls', pollId), { active });
      return true;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.togglePollActive(pollId, active);
      }
      handleFirestoreError(err, OperationType.UPDATE, `polls/${pollId}`);
      return false;
    }
  }

  async togglePollRandomize(pollId: string, randomize: boolean): Promise<boolean> {
    if (this.useFallback) {
      const list = this.getLocalPolls();
      const poll = list.find(p => p._id === pollId);
      if (!poll) return false;
      poll.randomizeOptions = randomize;
      this.saveLocalPolls(list);
      return true;
    }

    try {
      await updateDoc(doc(this.firestore, 'polls', pollId), { randomizeOptions: randomize });
      return true;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.togglePollRandomize(pollId, randomize);
      }
      handleFirestoreError(err, OperationType.UPDATE, `polls/${pollId}`);
      return false;
    }
  }

  private getLocalUserVotes(): UserVote[] {
    const filePath = path.join(process.cwd(), 'data/user_votes.json');
    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private saveLocalUserVotes(list: UserVote[]) {
    const filePath = path.join(process.cwd(), 'data/user_votes.json');
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  private getLocalPollComments(): PollComment[] {
    const filePath = path.join(process.cwd(), 'data/poll_comments.json');
    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private saveLocalPollComments(list: PollComment[]) {
    const filePath = path.join(process.cwd(), 'data/poll_comments.json');
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  // Get user votes by email
  async getUserVotes(email: string): Promise<UserVote[]> {
    if (this.useFallback) {
      return this.getLocalUserVotes().filter(v => v.email && v.email.toLowerCase() === email.toLowerCase());
    }
    try {
      const q = query(collection(this.firestore, 'user_votes'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          username: data.username || '',
          email: data.email || '',
          pollId: data.pollId || '',
          optionIndex: Number(data.optionIndex),
          optionText: data.optionText || '',
          question: data.question || '',
          votedAt: safeISOString(data.votedAt)
        } as UserVote;
      });
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getUserVotes(email);
      }
      handleFirestoreError(err, OperationType.LIST, 'user_votes');
      return [];
    }
  }

  // Get all user votes for admin trends analytics
  async getAllUserVotes(): Promise<UserVote[]> {
    if (this.useFallback) {
      return this.getLocalUserVotes();
    }
    try {
      const snap = await getDocs(collection(this.firestore, 'user_votes'));
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          username: data.username || '',
          email: data.email || '',
          pollId: data.pollId || '',
          optionIndex: Number(data.optionIndex),
          optionText: data.optionText || '',
          question: data.question || '',
          votedAt: safeISOString(data.votedAt)
        } as UserVote;
      });
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getAllUserVotes();
      }
      handleFirestoreError(err, OperationType.LIST, 'user_votes');
      return [];
    }
  }

  // Save individual user vote
  async saveUserVote(vote: Omit<UserVote, '_id'>): Promise<UserVote> {
    const voteData = {
      username: vote.username,
      email: vote.email.toLowerCase(),
      pollId: vote.pollId,
      optionIndex: Number(vote.optionIndex),
      optionText: vote.optionText,
      question: vote.question,
      votedAt: vote.votedAt || new Date().toISOString()
    };

    if (this.useFallback) {
      const list = this.getLocalUserVotes();
      // To prevent duplicate votes by same user, remove existing first
      const filtered = list.filter(v => !(v.email && v.email.toLowerCase() === voteData.email && v.pollId === voteData.pollId));
      const newVote = {
        _id: 'local-vote-' + Date.now(),
        ...voteData
      };
      filtered.push(newVote);
      this.saveLocalUserVotes(filtered);
      return newVote;
    }

    try {
      // Clean up previous votes of this user on this poll
      const q = query(
        collection(this.firestore, 'user_votes'),
        where('email', '==', voteData.email),
        where('pollId', '==', voteData.pollId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(this.firestore, 'user_votes', d.id));
      }

      const docRef = await addDoc(collection(this.firestore, 'user_votes'), voteData);
      return {
        _id: docRef.id,
        ...voteData
      };
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.saveUserVote(vote);
      }
      handleFirestoreError(err, OperationType.CREATE, 'user_votes');
      throw err;
    }
  }

  // Get comments by poll ID
  async getCommentsByPollId(pollId: string): Promise<PollComment[]> {
    if (this.useFallback) {
      return this.getLocalPollComments()
        .filter(c => c.pollId === pollId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    try {
      const q = query(collection(this.firestore, 'poll_comments'), where('pollId', '==', pollId));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          pollId: data.pollId || '',
          username: data.username || '',
          name: data.name || '',
          email: data.email || '',
          photoUrl: data.photoUrl || '',
          commentText: data.commentText || '',
          createdAt: safeISOString(data.createdAt),
          upvotes: Number(data.upvotes || 0),
          upvotedUsers: data.upvotedUsers || []
        } as PollComment;
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getCommentsByPollId(pollId);
      }
      handleFirestoreError(err, OperationType.LIST, 'poll_comments');
      return [];
    }
  }

  // Create new comment
  async createComment(comment: Omit<PollComment, '_id'>): Promise<PollComment> {
    const commentData = {
      pollId: comment.pollId,
      username: comment.username,
      name: comment.name,
      email: comment.email.toLowerCase(),
      photoUrl: comment.photoUrl || '',
      commentText: comment.commentText,
      createdAt: comment.createdAt || new Date().toISOString(),
      upvotes: Number(comment.upvotes || 0),
      upvotedUsers: comment.upvotedUsers || []
    };

    if (this.useFallback) {
      const list = this.getLocalPollComments();
      const newComment = {
        _id: 'local-comment-' + Date.now(),
        ...commentData
      };
      list.push(newComment);
      this.saveLocalPollComments(list);
      return newComment;
    }

    try {
      const docRef = await addDoc(collection(this.firestore, 'poll_comments'), commentData);
      return {
        _id: docRef.id,
        ...commentData
      };
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.createComment(comment);
      }
      handleFirestoreError(err, OperationType.CREATE, 'poll_comments');
      throw err;
    }
  }

  // Upvote comment
  async upvoteComment(commentId: string, userEmail: string): Promise<boolean> {
    const email = userEmail.toLowerCase();
    if (this.useFallback) {
      const list = this.getLocalPollComments();
      const comment = list.find(c => c._id === commentId);
      if (!comment) return false;
      if (!comment.upvotedUsers) comment.upvotedUsers = [];
      if (comment.upvotedUsers.map(e => e.toLowerCase()).includes(email)) {
        comment.upvotedUsers = comment.upvotedUsers.filter(e => e.toLowerCase() !== email);
        comment.upvotes = Math.max(0, comment.upvotes - 1);
      } else {
        comment.upvotedUsers.push(email);
        comment.upvotes = (comment.upvotes || 0) + 1;
      }
      this.saveLocalPollComments(list);
      return true;
    }

    try {
      const docRef = doc(this.firestore, 'poll_comments', commentId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;
      const data = snap.data();
      let upvotedUsers = data.upvotedUsers || [];
      let upvotes = Number(data.upvotes || 0);

      if (upvotedUsers.map((e: string) => e.toLowerCase()).includes(email)) {
        upvotedUsers = upvotedUsers.filter((e: string) => e.toLowerCase() !== email);
        upvotes = Math.max(0, upvotes - 1);
      } else {
        upvotedUsers.push(email);
        upvotes += 1;
      }

      await updateDoc(docRef, { upvotes, upvotedUsers });
      return true;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.upvoteComment(commentId, userEmail);
      }
      handleFirestoreError(err, OperationType.UPDATE, `poll_comments/${commentId}`);
      return false;
    }
  }

  // Notifications local support
  private getLocalNotifications(): SiteNotification[] {
    const filePath = path.join(process.cwd(), 'data/notifications.json');
    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private saveLocalNotifications(list: SiteNotification[]) {
    const filePath = path.join(process.cwd(), 'data/notifications.json');
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  // Get notifications for user by email
  async getUserNotifications(email: string): Promise<SiteNotification[]> {
    if (this.useFallback) {
      return this.getLocalNotifications().filter(n => n.email && n.email.toLowerCase() === email.toLowerCase());
    }
    try {
      const q = query(collection(this.firestore, 'notifications'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          email: data.email || '',
          pollId: data.pollId || '',
          title: data.title || '',
          message: data.message || '',
          read: !!data.read,
          createdAt: safeISOString(data.createdAt)
        } as SiteNotification;
      });
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.getUserNotifications(email);
      }
      handleFirestoreError(err, OperationType.LIST, 'notifications');
      return [];
    }
  }

  // Save new notification
  async saveNotification(notif: Omit<SiteNotification, '_id'>): Promise<SiteNotification> {
    const notifData = {
      email: notif.email.toLowerCase(),
      pollId: notif.pollId,
      title: notif.title,
      message: notif.message,
      read: !!notif.read,
      createdAt: notif.createdAt || new Date().toISOString()
    };

    if (this.useFallback) {
      const list = this.getLocalNotifications();
      const newNotif = {
        _id: 'notif_' + Math.random().toString(36).substr(2, 9),
        ...notifData
      };
      list.push(newNotif);
      this.saveLocalNotifications(list);
      return newNotif;
    }

    try {
      const docRef = await addDoc(collection(this.firestore, 'notifications'), notifData);
      return { _id: docRef.id, ...notifData };
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.saveNotification(notif);
      }
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
      throw err;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(id: string): Promise<boolean> {
    if (this.useFallback) {
      const list = this.getLocalNotifications();
      const item = list.find(n => n._id === id);
      if (item) {
        item.read = true;
        this.saveLocalNotifications(list);
        return true;
      }
      return false;
    }

    try {
      const docRef = doc(this.firestore, 'notifications', id);
      await updateDoc(docRef, { read: true });
      return true;
    } catch (err) {
      if (this.checkIfFallbackNeeded(err)) {
        return this.markNotificationAsRead(id);
      }
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
      return false;
    }
  }
}
