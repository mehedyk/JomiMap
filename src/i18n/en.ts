export const en = {
  // App
  appName: 'JomiMap',
  tagline: 'Land Measurement Tool',
  taglineSub: 'Measure any land from a map PDF or image',

  // Nav
  navHome: 'Home',
  navMeasure: 'Measure',
  navUnitsGuide: 'Units Guide',
  navCredits: 'Credits',

  // Home
  homeHero: 'Measure Land From Any Map',
  homeHeroSub: 'Upload a map PDF or image, set the scale, and measure distances and areas instantly.',
  homeGetStarted: 'Start Measuring',
  homeUnitsGuide: 'View Units Guide',
  homeFeature1Title: 'PDF & Image Support',
  homeFeature1Desc: 'Load high-quality PDFs or images up to 20MB. Navigate multi-page PDFs with ease.',
  homeFeature2Title: 'All Bangladesh Units',
  homeFeature2Desc: 'Results in Bigha, Katha, Decimal, Acre, Hectare, sq ft, sq meters — all at once.',
  homeFeature3Title: 'Draw to Calibrate',
  homeFeature3Desc: 'Set the map scale by drawing a line over a known distance on the map.',
  homeFeature4Title: 'Export Report',
  homeFeature4Desc: 'Generate a PDF report with the highlighted area, all measurements, and a verified stamp.',

  // Measure page
  measureUploadPrompt: 'Upload a map PDF or image',
  measureUploadSub: 'Supports PDF, JPG, PNG — up to 20MB',
  measureUploadBtn: 'Choose File',
  measureOrDrop: 'or drag and drop here',
  measureScale: 'Map Scale',
  measureScaleDefault: '16 inches = 1 mile (default)',
  measureScaleCustom: 'Custom scale',
  measureScaleCalibrate: 'Draw to calibrate',
  measureToolDistance: 'Distance',
  measureToolArea: 'Area',
  measureToolPan: 'Pan',
  measureUndo: 'Undo',
  measureClear: 'Clear All',
  measureResults: 'Measurement Results',
  measureNoResults: 'No measurements yet. Use the tools above.',
  measureExport: 'Export PDF Report',
  measurePage: 'Page',
  measureOf: 'of',

  // Units guide
  unitsGuideTitle: 'Bangladesh Land Units Guide',
  unitsGuideSub: 'Complete reference for all land measurement units used in Bangladesh',
  unitsTableUnit: 'Unit',
  unitsTableBengali: 'Bengali',
  unitsTableSqFt: 'Sq Feet',
  unitsTableSqM: 'Sq Meters',
  unitsConversionsTitle: 'Conversion Chain',
  unitsTangailNote: 'Note: Katha and Bigha values shown are for Tangail district standard.',

  // Units
  unitSqFt: 'Square Feet',
  unitSqM: 'Square Meters',
  unitDecimal: 'Decimal',
  unitKatha: 'Katha',
  unitBigha: 'Bigha',
  unitAcre: 'Acre',
  unitHectare: 'Hectare',
  unitSqKm: 'Square Kilometer',

  // Credits
  creditsTitle: 'Credits & Acknowledgement',
  creditsAyatLabel: 'Surah Al-An\'am, 6:59',
  creditsAyatArabic: 'وَعِندَهُۥ مَفَاتِحُ ٱلْغَيْبِ لَا يَعْلَمُهَآ إِلَّا هُوَ ۚ وَيَعْلَمُ مَا فِى ٱلْبَرِّ وَٱلْبَحْرِ ۚ وَمَا تَسْقُطُ مِن وَرَقَةٍ إِلَّا يَعْلَمُهَا',
  creditsAyatTranslation: 'And with Him are the keys of the unseen; none knows them except Him. And He knows what is on the land and in the sea. Not a leaf falls but that He knows it.',
  creditsMadeBy: 'Made by',
  creditsMadeByName: 'Mehedy',
  creditsOpenSource: 'This project is open source.',
  creditsViewGithub: 'View on GitHub',
  creditsTechStack: 'Built with',

  // Theme
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSepia: 'Sepia',

  // Lang toggle
  langToggle: 'বাংলা',

  // Footer
  footerMadeBy: 'Made by',
  footerRights: 'Open source. Free to use.',

  // Errors
  errorFileSize: 'File is too large. Maximum size is 20MB.',
  errorFileType: 'Unsupported file type. Please upload a PDF, JPG, or PNG.',
  errorGeneric: 'Something went wrong. Please try again.',
}

export type TranslationKeys = keyof typeof en
