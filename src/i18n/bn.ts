import type { TranslationKeys } from './en'

export const bn: Record<TranslationKeys, string> = {
  // App
  appName: 'জমিম্যাপ',
  tagline: 'জমি পরিমাপ যন্ত্র',
  taglineSub: 'যেকোনো ম্যাপ PDF বা ছবি থেকে জমি মাপুন',

  // Nav
  navHome: 'হোম',
  navMeasure: 'মাপুন',
  navUnitsGuide: 'একক গাইড',
  navCredits: 'ক্রেডিট',

  // Home
  homeHero: 'যেকোনো ম্যাপ থেকে জমি মাপুন',
  homeHeroSub: 'ম্যাপের PDF বা ছবি আপলোড করুন, স্কেল সেট করুন এবং দূরত্ব ও ক্ষেত্রফল মাপুন।',
  homeGetStarted: 'মাপা শুরু করুন',
  homeUnitsGuide: 'একক গাইড দেখুন',
  homeFeature1Title: 'PDF ও ছবি সমর্থন',
  homeFeature1Desc: '২০ এমবি পর্যন্ত উচ্চমানের PDF বা ছবি লোড করুন। বহু পৃষ্ঠার PDF সহজে নেভিগেট করুন।',
  homeFeature2Title: 'বাংলাদেশের সকল একক',
  homeFeature2Desc: 'বিঘা, কাঠা, শতক, একর, হেক্টর, বর্গফুট, বর্গমিটার — সব একসাথে দেখুন।',
  homeFeature3Title: 'লাইন এঁকে ক্যালিব্রেট করুন',
  homeFeature3Desc: 'ম্যাপে পরিচিত দূরত্বের উপর লাইন এঁকে স্কেল সেট করুন।',
  homeFeature4Title: 'রিপোর্ট তৈরি করুন',
  homeFeature4Desc: 'হাইলাইট করা এলাকা, সকল মাপ এবং যাচাই স্ট্যাম্পসহ PDF রিপোর্ট তৈরি করুন।',

  // Measure page
  measureUploadPrompt: 'ম্যাপের PDF বা ছবি আপলোড করুন',
  measureUploadSub: 'PDF, JPG, PNG সমর্থিত — সর্বোচ্চ ২০ এমবি',
  measureUploadBtn: 'ফাইল বাছুন',
  measureOrDrop: 'অথবা এখানে টেনে আনুন',
  measureScale: 'ম্যাপের স্কেল',
  measureScaleDefault: '১৬ ইঞ্চি = ১ মাইল (ডিফল্ট)',
  measureScaleCustom: 'কাস্টম স্কেল',
  measureScaleCalibrate: 'লাইন এঁকে ক্যালিব্রেট করুন',
  measureToolDistance: 'দূরত্ব',
  measureToolArea: 'ক্ষেত্রফল',
  measureToolPan: 'সরান',
  measureUndo: 'পূর্বাবস্থা',
  measureClear: 'সব মুছুন',
  measureResults: 'পরিমাপের ফলাফল',
  measureNoResults: 'এখনো কোনো পরিমাপ নেই। উপরের টুল ব্যবহার করুন।',
  measureExport: 'PDF রিপোর্ট তৈরি করুন',
  measurePage: 'পৃষ্ঠা',
  measureOf: 'এর',

  // Units guide
  unitsGuideTitle: 'বাংলাদেশের জমি পরিমাপ একক গাইড',
  unitsGuideSub: 'বাংলাদেশে ব্যবহৃত সকল জমি পরিমাপ এককের সম্পূর্ণ রেফারেন্স',
  unitsTableUnit: 'একক',
  unitsTableBengali: 'বাংলা',
  unitsTableSqFt: 'বর্গফুট',
  unitsTableSqM: 'বর্গমিটার',
  unitsConversionsTitle: 'রূপান্তর তালিকা',
  unitsTangailNote: 'দ্রষ্টব্য: কাঠা ও বিঘার মান টাঙ্গাইল জেলার মানদণ্ড অনুযায়ী।',

  // Units
  unitSqFt: 'বর্গফুট',
  unitSqM: 'বর্গমিটার',
  unitDecimal: 'শতক',
  unitKatha: 'কাঠা',
  unitBigha: 'বিঘা',
  unitAcre: 'একর',
  unitHectare: 'হেক্টর',
  unitSqKm: 'বর্গকিলোমিটার',

  // Credits
  creditsTitle: 'ক্রেডিট ও কৃতজ্ঞতা',
  creditsAyatLabel: 'সূরা আল-আন\'আম, ৬:৫৯',
  creditsAyatArabic: 'وَعِندَهُۥ مَفَاتِحُ ٱلْغَيْبِ لَا يَعْلَمُهَآ إِلَّا هُوَ ۚ وَيَعْلَمُ مَا فِى ٱلْبَرِّ وَٱلْبَحْرِ ۚ وَمَا تَسْقُطُ مِن وَرَقَةٍ إِلَّا يَعْلَمُهَا',
  creditsAyatTranslation: 'এবং তাঁর কাছেই গায়েবের চাবিকাঠি রয়েছে, তিনি ছাড়া কেউ তা জানে না। তিনি জানেন যা কিছু স্থলে ও সমুদ্রে আছে। একটি পাতাও ঝরে না, কিন্তু তিনি তা জানেন।',
  creditsMadeBy: 'বানিয়েছেন',
  creditsMadeByName: 'মেহেদী',
  creditsOpenSource: 'এই প্রকল্পটি ওপেন সোর্স।',
  creditsViewGithub: 'গিটহাবে দেখুন',
  creditsTechStack: 'তৈরি হয়েছে',

  // Theme
  themeLight: 'আলো',
  themeDark: 'অন্ধকার',
  themeSepia: 'সেপিয়া',

  // Lang toggle
  langToggle: 'English',

  // Footer
  footerMadeBy: 'বানিয়েছেন',
  footerRights: 'ওপেন সোর্স। বিনামূল্যে ব্যবহারযোগ্য।',

  // Errors
  errorFileSize: 'ফাইলটি অনেক বড়। সর্বোচ্চ আকার ২০ এমবি।',
  errorFileType: 'অসমর্থিত ফাইল ধরন। অনুগ্রহ করে PDF, JPG বা PNG আপলোড করুন।',
  errorGeneric: 'কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।',
}
