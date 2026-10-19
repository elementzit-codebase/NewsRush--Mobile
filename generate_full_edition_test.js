const fs = require('fs');
const path = require('path');

// 19 Complete Malayalam News Stories with realistic lengths matching target capacities
const testEdition = {
  id: 999,
  newspaper_name: "NewsRush Daily",
  date: "2026-10-16",
  edition_label: "Evening",
  language: "malayalam",
  status: "ready"
};

// Realistic photos from Unsplash for news
const PHOTOS = {
  metro: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
  kerala: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80",
  cricket: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80",
  special: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
};

// Helper for repeating/generating realistic Malayalam text
function makeParagraphs(lead, repeats) {
  const parts = [lead];
  const fillers = [
    "സംസ്ഥാനത്തിന്റെ സമഗ്ര വികസനത്തിന് ആക്കം കൂട്ടുന്ന സുപ്രധാന പദ്ധതികൾ സമയബന്ധിതമായി പൂർത്തിയാക്കാൻ സർക്കാർ തലത്തിൽ കർശന നിർദ്ദേശം നൽകിയിട്ടുണ്ട്. വിവിധ വകുപ്പുകളുടെ ഏകോപനം ഉറപ്പാക്കി ജനകീയ പങ്കാളിത്തത്തോടെ പദ്ധതികൾ നടപ്പാക്കാനാണ് തീരുമാനം.",
    "അടിസ്ഥാന സൗകര്യ വികസനത്തോടൊപ്പം സാധാരണക്കാരുടെ ജീവിതനിലവാരം ഉയർത്തുന്നതിനാണ് സർക്കാർ മുൻഗണന നൽകുന്നത്. നഗര-ഗ്രാമ വ്യത്യാസമില്ലാതെ ആധുനിക സൗകര്യങ്ങൾ ജനങ്ങളിലേക്ക് എത്തിക്കാൻ വിവിധ ഏജൻസികൾ യോജിച്ചു പ്രവർത്തിക്കും.",
    "സാമ്പത്തിക വളർച്ചയും പരിസ്ഥിതി സംരക്ഷണവും ഒരുപോലെ മുൻനിർത്തിയുള്ള വികസന മാതൃകയാണ് സംസ്ഥാനം ലക്ഷ്യമിടുന്നത്. ഈ പദ്ധതിയിലൂടെ ആയിരക്കണക്കിന് പുതിയ തൊഴിലവസരങ്ങൾ സൃഷ്ടിക്കപ്പെടുമെന്നാണ് വിലയിരുത്തൽ.",
    "പൊതുജനങ്ങളുടെ അഭിപ്രായങ്ങളും നിർദ്ദേശങ്ങളും സ്വരൂപിച്ചാണ് തുടർനടപടികൾ സ്വീകരിക്കുക. പരാതികൾ പരിഹരിക്കുന്നതിനായി പ്രത്യേക സമിതിയെ നിയോഗിക്കാനും തീരുമാനമായിട്ടുണ്ട്.",
    "സാങ്കേതികവിദ്യയുടെ സാധ്യതകൾ പരമാവധി പ്രയോജനപ്പെടുത്തി സുതാര്യമായ ഭരണനിർവ്വഹണം ഉറപ്പാക്കുമെന്ന് അധികൃതർ വാർത്താസമ്മേളനത്തിൽ വ്യക്തമാക്കി."
  ];
  for (let i = 0; i < repeats; i++) {
    parts.push(fillers[i % fillers.length]);
  }
  return parts.join("\n\n");
}

const sections = {
  // PAGE 1
  main_breaking_news: {
    section_name: "Main Breaking News",
    title: "കൊച്ചി മെട്രോ കാക്കനാട് പാത: നിർമ്മാണം വേഗത്തിലാക്കാൻ മന്ത്രിസഭാ തീരുമാനം",
    content: makeParagraphs(
      "കൊച്ചി: കൊച്ചി മെട്രോയുടെ രണ്ടാം ഘട്ടമായ ജവഹർലാൽ നെഹ്റു സ്റ്റേഡിയം മുതൽ കാക്കനാട് ഇൻഫോപാർക്ക് വരെയുള്ള പാതയുടെ നിർമ്മാണ പ്രവർത്തനങ്ങൾ വേഗത്തിലാക്കാൻ മന്ത്രിസഭാ യോഗം തീരുമാനിച്ചു. പദ്ധതിക്കാവശ്യമായ ഭൂമി ഏറ്റെടുക്കൽ പൂർത്തിയായ സാഹചര്യത്തിൽ നിർമ്മാണ പ്രവർത്തനങ്ങൾ നിശ്ചിത സമയപരിധിക്കുള്ളിൽ പൂർത്തിയാക്കാൻ കരാർ കമ്പനികൾക്ക് കർശന നിർദ്ദേശം നൽകി. വിവരസാങ്കേതിക മേഖലയിലെ ജീവനക്കാർക്കും കാക്കനാട് നിവാസികൾക്കും ഈ പാത യാഥാർത്ഥ്യമാകുന്നതോടെ യാത്രാക്ലേശത്തിന് വലിയ പരിഹാരമാകും.",
      10
    ),
    image_url: PHOTOS.metro,
    image_caption: "കാക്കനാട് ഇൻഫോപാർക്കിലേക്ക് നീളുന്ന മെട്രോ റെയിൽ നിർമ്മാണ പ്രവൃത്തികൾ ദ്രുതഗതിയിൽ പുരോഗമിക്കുന്നു. (ചിത്രം: ന്യൂസ് റഷ്)",
    photoMode: "lead"
  },
  kerala_highlights: {
    section_name: "Kerala Highlights",
    title: "സംസ്ഥാനത്തെ സ്കൂളുകളിൽ ആർട്ടിഫിഷ്യൽ ഇന്റലിജൻസ് ലാബുകൾ ഉടൻ സജ്ജമാക്കും",
    content: makeParagraphs(
      "തിരുവനന്തപുരം: പൊതുവിദ്യാഭ്യാസ രംഗത്ത് വലിയ വിപ്ലവത്തിന് തുടക്കം കുറിച്ചുകൊണ്ട് സംസ്ഥാനത്തെ തെരഞ്ഞെടുത്ത ഹയർ സെക്കൻഡറി സ്കൂളുകളിൽ എഐ ലാബുകൾ ഒരുക്കാൻ പൊതുവിദ്യാഭ്യാസ വകുപ്പ് നടപടി തുടങ്ങി. കുട്ടികളിൽ നവീന സാങ്കേതിക വിദ്യകളെക്കുറിച്ചുള്ള അവബോധം വളർത്തുകയാണ് ലക്ഷ്യം.",
      6
    ),
    photoMode: "none"
  },
  local_highlights: {
    section_name: "Local Highlights",
    title: "നഗരത്തിലെ റോഡ് നവീകരണം അവസാന ഘട്ടത്തിൽ",
    content: makeParagraphs(
      "കോഴിക്കോട്: നഗരത്തിലെ പ്രധാന റോഡുകളുടെ നവീകരണവും റീ-ടാർലിംഗും അടുത്ത ആഴ്ചയോടെ പൂർത്തിയാകും. ഗതാഗതക്കുരുക്ക് ഒഴിവാക്കാനുള്ള മുന്നൊരുക്കങ്ങൾ ആരംഭിച്ചു.",
      3
    ),
    photoMode: "none"
  },
  short_news: {
    section_name: "Short News",
    title: "സംസ്ഥാനത്തെ പ്രധാന വാർത്താ സംഗ്രഹം: ചുരുക്കത്തിൽ",
    content: makeParagraphs(
      "സംസ്ഥാനത്തെ വിവിധ മേഖലകളിൽ നിന്നുള്ള പ്രധാന വാർത്താ ചുരുക്കങ്ങൾ: പുതിയ സബ് സ്റ്റേഷൻ ഉദ്ഘാടനം നാളെ. കർഷകർക്കായി ആശ്വാസ പാക്കേജ്. വിനോദസഞ്ചാര മേഖലയിൽ 25 ശതമാനം വർദ്ധനവ് രേഖപ്പെടുത്തി.",
      5
    ),
    photoMode: "none"
  },

  // PAGE 2
  kerala_news: {
    section_name: "Kerala News",
    title: "തീരദേശ സംരക്ഷണത്തിന് 1500 കോടിയുടെ സമഗ്ര പദ്ധതി",
    content: makeParagraphs(
      "തിരുവനന്തപുരം: സംസ്ഥാനത്തെ തീരപ്രദേശങ്ങളിൽ കടലാക്രമണം തടയുന്നതിനും തീരദേശവാസികളുടെ പുനരധിവാസത്തിനുമായി 1500 കോടി രൂപയുടെ സമഗ്ര പാക്കേജിന് അനുമതി നൽകി. പുലിമുട്ടുകളുടെ നിർമ്മാണവും ടെട്രാപോഡ് വിന്യാസവും ഉടൻ തുടങ്ങും.",
      7
    ),
    image_url: PHOTOS.kerala,
    image_caption: "തീരദേശ സംരക്ഷണ പദ്ധതിയുടെ നിർമ്മാണ സാമഗ്രികൾ ഒരുക്കുന്നു.",
    photoMode: "lead"
  },
  district_news: {
    section_name: "District News",
    title: "ജില്ലാതല കായികമേളയ്ക്ക് നാളെ തുടക്കം",
    content: makeParagraphs(
      "തൃശ്ശൂർ: ജില്ലാ അത്‌ലറ്റിക്സ് മീറ്റിന് നാളെ പ്രധാന സ്റ്റേഡിയത്തിൽ വർണ്ണാഭമായ തുടക്കം. 14 ഉപജില്ലകളിൽ നിന്നായി മൂവായിരത്തിലധികം കായികതാരങ്ങൾ മാറ്റുരയ്ക്കും.",
      3
    ),
    photoMode: "none"
  },
  politics: {
    section_name: "Politics",
    title: "നിയമസഭാ ഉപതെരഞ്ഞെടുപ്പ്: മുന്നണികൾ പ്രചാരണം ശക്തമാക്കി",
    content: makeParagraphs(
      "പാലക്കാട്: ഉപതെരഞ്ഞെടുപ്പ് നടക്കുന്ന മണ്ഡലങ്ങളിൽ മുന്നണി നേതാക്കൾ നേരിട്ടെത്തി പ്രചാരണത്തിന് നേതൃത്വം നൽകുന്നു. ഭവന സന്ദർശനങ്ങളും റോഡ് ഷോകളും ഊർജ്ജിതമായി.",
      6
    ),
    photoMode: "none"
  },
  crime_civic: {
    section_name: "Crime / Civic News",
    title: "ലഹരി വിരുദ്ധ സ്പെഷ്യൽ ഡ്രൈവ്: പരിശോധന ശക്തം",
    content: makeParagraphs(
      "കൊച്ചി: നഗരപരിധിയിൽ എക്സൈസും പോലീസും സംയുക്തമായി നടത്തിയ റെയ്ഡിൽ അനധികൃത ലഹരി വിൽപ്പന സംഘങ്ങൾ പിടിയിലായി.",
      3
    ),
    photoMode: "none"
  },
  short_news_2: {
    section_name: "Short News",
    title: "മേഖലാ വികസന വാർത്തകൾ ഒറ്റനോട്ടത്തിൽ",
    content: makeParagraphs(
      "ദേശീയപാത 66 വികസനത്തിന്റെ ഭാഗമായുള്ള മേൽപ്പാലം നിർമ്മാണം പുരോഗമിക്കുന്നു. വനയോര മേഖലകളിൽ സൗരോർജ്ജ വേലികൾ സ്ഥാപിക്കാൻ പുതിയ ഫണ്ട് അനുവദിച്ചു.",
      5
    ),
    photoMode: "none"
  },

  // PAGE 3
  sports: {
    section_name: "Sports",
    title: "ഇന്ത്യൻ പ്രീമിയർ ലീഗ്: സഞ്ജു സാംസന്റെ നായകത്വത്തിൽ രാജസ്ഥാന് തകർപ്പൻ വിജയം",
    content: makeParagraphs(
      "മുംബൈ: ആവേശകരമായ മത്സരത്തിൽ അവസാന പന്തിൽ വിജയം പിടിച്ചെടുത്ത് രാജസ്ഥാൻ റോയൽസ്. ക്യാപ്റ്റൻ സഞ്ജു സാംസന്റെ തകർപ്പൻ അർദ്ധസെഞ്ച്വറിയും ഡെത്ത് ഓവറുകളിലെ കൃത്യതയാർന്ന ബൗളിംഗുമാണ് ടീമിന് അവിസ്മരണീയ വിജയം സമ്മാനിച്ചത്. സ്റ്റേഡിയത്തിൽ നിറഞ്ഞ ആയിരക്കണക്കിന് ആരാധകരെ സാക്ഷിയാക്കിയായിരുന്നു റോയൽസിന്റെ മാസ്മരിക പ്രകടനം.",
      10
    ),
    image_url: PHOTOS.cricket,
    image_caption: "നായകന്റെ ഇന്നിംഗ്സുമായി ടീമിനെ വിജയത്തിലേക്ക് നയിച്ച സഞ്ജു സാംസൺ.",
    photoMode: "lead"
  },
  cricket_football: {
    section_name: "Cricket/Football",
    title: "കേരള ബ്ലാസ്റ്റേഴ്സ് അടുത്ത ഹോം മത്സരത്തിന് ഒരുങ്ങുന്നു",
    content: makeParagraphs(
      "കൊച്ചി: ഐഎസ്എല്ലിൽ നിർണ്ണായക മത്സരത്തിന് തയ്യാറെടുത്ത് മഞ്ഞപ്പട. കൊച്ചി ജവഹർലാൽ നെഹ്റു സ്റ്റേഡിയത്തിൽ നടക്കുന്ന പോരാട്ടത്തിന് ടിക്കറ്റ് വിൽപ്പന പൂർത്തിയായി.",
      5
    ),
    photoMode: "none"
  },
  business: {
    section_name: "Business",
    title: "ഓഹരി വിപണിയിൽ മുന്നേറ്റം: സെൻസെക്സ് സർവ്വകാല ഉയരത്തിൽ",
    content: makeParagraphs(
      "മുംബൈ: ബാങ്കിംഗ്, ഐടി ഓഹരികളുടെ കരുത്തിൽ ഇന്ത്യൻ ഓഹരി വിപണി റെക്കോർഡ് ഉയരം തൊട്ടു.",
      4
    ),
    photoMode: "none"
  },
  cinema: {
    section_name: "Cinema",
    title: "മലയാള ചലച്ചിത്രങ്ങൾക്ക് അന്താരാഷ്ട്ര മേളകളിൽ പ്രശംസ",
    content: makeParagraphs(
      "ഗോവ: അന്താരാഷ്ട്ര ചലച്ചിത്രമേളയിൽ സമഗ്ര പ്രമേയം കൊണ്ട് മലയാള ചിത്രങ്ങൾ പ്രേക്ഷകശ്രദ്ധ ആകർഷിച്ചു.",
      4
    ),
    photoMode: "none"
  },
  entertainment: {
    section_name: "Entertainment",
    title: "കലാഭവൻ മണിയുടെ സ്മരണയിൽ സംഗീത സായാഹ്നം",
    content: makeParagraphs(
      "ചാലക്കുടി: ജനപ്രിയ ഗായകൻ കലാഭവൻ മണിയുടെ ഓർമ്മ പുതുക്കി വിപുലമായ നാടൻപാട്ട് മേള അരങ്ങേറി.",
      4
    ),
    photoMode: "none"
  },

  // PAGE 4
  special_story: {
    section_name: "Special Story",
    title: "വനമധ്യത്തിലെ ഏകാധ്യാപക വിദ്യാലയം: അറിവിന്റെ വെളിച്ചം പകരുന്ന അദ്ധ്യാപിക",
    content: makeParagraphs(
      "വയനാട്: ഉൾവനത്തിലെ ആദിവാസി ഊരിലേക്ക് ദിവസവും കിലോമീറ്ററുകൾ കാൽനടയായി യാത്ര ചെയ്ത് കുരുന്നുകൾക്ക് അറിവു പകരുന്ന ഒരു അദ്ധ്യാപികയുടെ കഥ. പ്രതികൂല കാലാവസ്ഥയും വന്യമൃഗങ്ങളുടെ ഭീഷണിയും വകവയ്ക്കാതെ കഴിഞ്ഞ പത്ത് വർഷമായി ഇവർ നടത്തുന്ന സേവനം നാടിന് മാതൃകയാവുകയാണ്. തലമുറകളുടെ മാറ്റത്തിനാണ് ഈ വിദ്യാലയം സാക്ഷിയാകുന്നത്.",
      10
    ),
    image_url: PHOTOS.special,
    image_caption: "വനഗ്രാമത്തിലെ വിദ്യാലയത്തിൽ കുട്ടികളോടൊപ്പം സമയം ചിലവഴിക്കുന്ന അദ്ധ്യാപിക.",
    photoMode: "lead"
  },
  human_interest: {
    section_name: "Human Interest",
    title: "ജീവകാരുണ്യ രംഗത്ത് മാതൃകയായി യുവാക്കളുടെ കൂട്ടായ്മ",
    content: makeParagraphs(
      "കണ്ണൂർ: ആശുപത്രികളിൽ എത്തുന്ന നിർദ്ധനരായ രോഗികൾക്ക് സൗജന്യ ഭക്ഷണവും മരുന്നും എത്തിച്ച് നൽകുന്ന യുവജന സംഘടന ശ്രദ്ധേയമാകുന്നു.",
      5
    ),
    photoMode: "none"
  },
  evening_updates: {
    section_name: "Evening Updates",
    title: "സംസ്ഥാനത്ത് അടുത്ത ദിവസങ്ങളിൽ വേനൽമഴ ശക്തമാകും",
    content: makeParagraphs(
      "തിരുവനന്തപുരം: കേന്ദ്ര കാലാവസ്ഥാ വകുപ്പിന്റെ പുതിയ മുന്നറിയിപ്പ് പ്രകാരം തെക്കൻ ജില്ലകളിൽ ശക്തമായ ഇടിമിന്നലോടു കൂടിയ മഴയ്ക്ക് സാധ്യത.",
      4
    ),
    photoMode: "none"
  },
  tomorrow: {
    section_name: "Tomorrow / What's Next",
    title: "നാളത്തെ പ്രധാന പരിപാടികൾ: തീയതിയും സമയവും",
    content: makeParagraphs(
      "സെക്രട്ടറിയേറ്റ് ദർബാർ ഹാളിൽ സംസ്ഥാന അവാർഡ് വിതരണം. കലൂർ സ്റ്റേഡിയത്തിൽ പ്രദർശനം ആരംഭിക്കും.",
      4
    ),
    photoMode: "none"
  },
  short_news_4: {
    section_name: "Short News",
    title: "സായാഹ്ന വാർത്താ വീക്ഷണം: വിശേഷങ്ങൾ",
    content: makeParagraphs(
      "ട്രെയിൻ ഗതാഗതത്തിൽ നിയന്ത്രണങ്ങൾ ഏർപ്പെടുത്തി. വിമാനത്താവള റൺവേ അറ്റകുറ്റപ്പണി വിജയകരമായി പൂർത്തിയായി.",
      4
    ),
    photoMode: "none"
  }
};

// Now import the templates definition
const templates = {
  1: {
    rows: [
      { weight: 3, blocks: [{ section_key: 'main_breaking_news', span: 3, size: 'lead', section_name: 'Main Breaking News' }] },
      { weight: 3, blocks: [
        { section_key: 'kerala_highlights', span: 2, size: 'body', section_name: 'Kerala Highlights' },
        { section_key: 'local_highlights', span: 1, size: 'tall', section_name: 'Local Highlights' }
      ]},
      { weight: 2, blocks: [{ section_key: 'short_news', span: 3, size: 'small', section_name: 'Short News' }] }
    ]
  },
  2: {
    rows: [
      { weight: 3, blocks: [
        { section_key: 'kerala_news', span: 2, size: 'body', section_name: 'Kerala News' },
        { section_key: 'district_news', span: 1, size: 'tall', section_name: 'District News' }
      ]},
      { weight: 3, blocks: [
        { section_key: 'politics', span: 2, size: 'body', section_name: 'Politics' },
        { section_key: 'crime_civic', span: 1, size: 'tall', section_name: 'Crime / Civic News' }
      ]},
      { weight: 2, blocks: [{ section_key: 'short_news_2', span: 3, size: 'small', section_name: 'Short News' }] }
    ]
  },
  3: {
    rows: [
      { weight: 3, blocks: [
        { section_key: 'sports', span: 2, size: 'body', section_name: 'Sports' },
        { section_key: 'cricket_football', span: 1, size: 'tall', section_name: 'Cricket/Football' }
      ]},
      { weight: 2, blocks: [
        { section_key: 'business', span: 1, size: 'small', section_name: 'Business' },
        { section_key: 'cinema', span: 1, size: 'small', section_name: 'Cinema' },
        { section_key: 'entertainment', span: 1, size: 'small', section_name: 'Entertainment' }
      ]}
    ]
  },
  4: {
    rows: [
      { weight: 3, blocks: [
        { section_key: 'special_story', span: 2, size: 'body', section_name: 'Special Story' },
        { section_key: 'human_interest', span: 1, size: 'tall', section_name: 'Human Interest' }
      ]},
      { weight: 2, blocks: [
        { section_key: 'evening_updates', span: 1, size: 'small', section_name: 'Evening Updates' },
        { section_key: 'tomorrow', span: 1, size: 'small', section_name: "Tomorrow / What's Next" },
        { section_key: 'short_news_4', span: 1, size: 'small', section_name: 'Short News' }
      ]}
    ]
  }
};

function slicedCharHtml(char) {
  const cuts = ['30%', '54%', '78%'];
  const cutsHtml = cuts
    .map(
      left =>
        `<span style="position: absolute; top: -0.6em; bottom: -0.6em; width: 0.055em; background: #ffffff; left: ${left}; transform: rotate(45deg);"></span>`
    )
    .join('');
  return `<span style="position: relative; display: inline-block; font-style: normal;">${char}<span style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none;">${cutsHtml}</span></span>`;
}

function logoWordHtml(word) {
  return [...word]
    .map((char, i) => (i > 0 && char === 'R' ? slicedCharHtml(char) : char))
    .join('');
}

function mastheadHtml(name) {
  const words = (name || 'NewsRush Daily').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const last = words.length - 1;
  return words
    .map((word, i) => {
      const rendered = logoWordHtml(word);
      if (words.length > 1 && i === last) {
        return `<span class="title-daily">${rendered}</span>`;
      }
      return rendered;
    })
    .join(' ');
}

function splitLeadStoryText(text, span = 3) {
  const trimmed = text.trim();
  const ratio = span === 3 ? 0.74 : 0.50;
  const target = Math.round(trimmed.length * ratio);
  
  // Try finding paragraph break
  const pMatch = trimmed.indexOf('\n\n', target - 150);
  if (pMatch !== -1 && pMatch < target + 150) {
    return {
      leftText: trimmed.slice(0, pMatch).trim(),
      rightText: trimmed.slice(pMatch + 2).trim()
    };
  }
  
  // Try period/sentence end
  const sMatch = trimmed.indexOf('. ', target - 80);
  if (sMatch !== -1 && sMatch < target + 80) {
    return {
      leftText: trimmed.slice(0, sMatch + 1).trim(),
      rightText: trimmed.slice(sMatch + 2).trim()
    };
  }
  
  return {
    leftText: trimmed.slice(0, target).trim(),
    rightText: trimmed.slice(target).trim()
  };
}

const PAGE_NAMES = [
  'Page 1 · Front Page',
  'Page 2 · Kerala & District',
  'Page 3 · Sports & Business',
  'Page 4 · Features & Evening',
];

function generateHtml() {
  const isMalayalam = true;
  let allPagesHtml = '';

  for (let pNum = 1; pNum <= 4; pNum++) {
    const isFront = pNum === 1;
    const pageLayout = templates[pNum];

    const headerHtml = isFront
      ? `
      <header class="masthead-front">
        <div class="meta-bar">
          <span>FRIDAY, OCTOBER 16, 2026</span>
          <span>EVENING EDITION</span>
        </div>
        <h1 class="newspaper-title">${mastheadHtml(testEdition.newspaper_name)}</h1>
        <p class="tagline">Your trusted source for breaking news</p>
      </header>
      `
      : `
      <header class="masthead-inner">
        <span class="inner-title">${mastheadHtml(testEdition.newspaper_name)}</span>
        <span class="inner-page">${PAGE_NAMES[pNum - 1].split('·')[1]?.trim()?.toUpperCase()} · PAGE ${pNum}</span>
      </header>
      `;

    const gridTemplateRows = pageLayout.rows.map(r => `${r.weight}fr`).join(' ');

    const rowsHtml = pageLayout.rows
      .flatMap((row) =>
        row.blocks.map(block => {
          const sec = sections[block.section_key];
          const isFirst = pageLayout.rows[0].blocks[0]?.section_key === block.section_key;
          const hasPhoto = Boolean(sec?.image_url && sec?.photoMode !== 'none');
          const label = sec?.section_name || block.section_name;
          const headline = sec?.title || label;
          const content = sec?.content || '';
          const totalCols = block.span === 3 ? 5 : block.span === 2 ? 3 : 2;

          let bodyHtml = '';
          if (isFirst && hasPhoto && sec?.image_url) {
            const leftCols = Math.max(1, totalCols - 2);
            const rightCols = totalCols - leftCols;
            const { leftText, rightText } = splitLeadStoryText(content, block.span);
            const leadPhotoHeightMm = block.span === 3 ? 42 : block.span === 2 ? 36 : 28;
            const captionHtml = sec.image_caption
              ? `<figcaption class="photo-caption">${sec.image_caption}</figcaption>`
              : '';

            bodyHtml = `
              <div class="lead-split-wrap">
                <div class="lead-left-col" style="flex: ${leftCols};">
                  <div class="body-columns cols-${leftCols}">${leftText.replace(/\n\n/g, '<br><br>')}</div>
                </div>
                <div class="lead-right-col" style="flex: ${rightCols};">
                  <figure class="lead-photo-figure">
                    <img src="${sec.image_url}" alt="" style="height: ${leadPhotoHeightMm}mm;" class="newspaper-photo" />
                    ${captionHtml}
                  </figure>
                  ${
                    rightText
                      ? `<div class="body-columns cols-${rightCols}" style="margin-top: 0;">${rightText.replace(/\n\n/g, '<br><br>')}</div>`
                      : '<div style="flex: 1; min-height: 0;"></div>'
                  }
                </div>
              </div>
            `;
          } else if (hasPhoto && sec?.image_url) {
            const photoHeightMm = block.size === 'small' ? 24 : 33;
            const captionHtml = sec.image_caption
              ? `<figcaption class="photo-caption">${sec.image_caption}</figcaption>`
              : '';
            bodyHtml = `
              <div class="body-columns cols-${totalCols}">
                <figure class="standard-photo-figure">
                  <img src="${sec.image_url}" alt="" style="height: ${photoHeightMm}mm;" class="newspaper-photo" />
                  ${captionHtml}
                </figure>
                ${content.replace(/\n\n/g, '<br><br>')}
              </div>
            `;
          } else {
            bodyHtml = `
              <div class="body-columns cols-${totalCols}">
                ${content.replace(/\n\n/g, '<br><br>')}
              </div>
            `;
          }

          return `
            <section class="newspaper-section" style="grid-column: span ${block.span} / span ${block.span};">
              <p class="section-tag">${label.toUpperCase()}</p>
              <h2 class="headline span-${block.span}">${headline}</h2>
              ${bodyHtml}
            </section>
          `;
        })
      )
      .join('');

    allPagesHtml += `
      <article class="sheet edition-malayalam" lang="ml">
        ${headerHtml}
        <div class="print-grid" style="grid-template-rows: ${gridTemplateRows};">
          ${rowsHtml}
        </div>
        <footer class="sheet-footer">
          <span>${testEdition.newspaper_name} · Friday, October 16, 2026</span>
          <span>Page ${pNum} of 4</span>
        </footer>
      </article>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="ml">
<head>
  <meta charset="utf-8">
  <title>NewsRush Daily - Print Edition Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700&family=Gayathri:wght@400;700&family=Inter:wght@400;500;600;700&family=Manjari:wght@400;700&family=Noto+Serif+Malayalam:wght@500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600;1,700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: 289mm 380mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 20px;
      background: #e2e8f0;
      font-family: "Anek Malayalam", "Inter", sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
        gap: 0;
      }
    }
    .sheet {
      width: 289mm;
      height: 380mm;
      max-height: 380mm;
      background: #fff;
      padding: 10mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    }
    @media print {
      .sheet {
        box-shadow: none;
      }
    }
    .sheet:not(:last-child) {
      page-break-after: always;
      break-after: page;
    }
    .sheet:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .masthead-front {
      border-bottom: 3px solid #000;
      padding-bottom: 2mm;
      margin-bottom: 2mm;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid #000;
      padding-bottom: 1mm;
      font-family: "Inter", sans-serif;
      font-size: 9pt;
      font-weight: 600;
      color: #000;
      text-transform: uppercase;
    }
    .newspaper-title {
      margin: 2mm 0 1mm 0;
      text-align: center;
      font-family: "Playfair Display", Georgia, serif;
      font-size: 42pt;
      line-height: 1;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #000;
    }
    .newspaper-title .title-daily {
      font-size: 0.7em;
      font-style: italic;
      font-weight: normal;
    }
    .tagline {
      margin: 1.5mm 0 0 0;
      text-align: center;
      font-family: "Inter", sans-serif;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #000;
    }
    .masthead-inner {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid #000;
      padding-bottom: 1.5mm;
      margin-bottom: 2mm;
    }
    .inner-title {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 14pt;
      font-weight: 700;
      line-height: 1;
      color: #000;
    }
    .inner-title .title-daily {
      font-size: 0.7em;
      font-style: italic;
      font-weight: normal;
    }
    .inner-page {
      font-family: "Inter", sans-serif;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #000;
    }
    .print-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
      flex: 1;
      min-height: 0;
      margin-top: 2mm;
      margin-bottom: 2mm;
    }
    .newspaper-section {
      display: flex;
      min-height: 0;
      flex-direction: column;
      overflow: hidden;
      border-top: 1px solid rgba(0,0,0,0.3);
      padding-top: 1.5mm;
    }
    .section-tag {
      font-family: "Inter", sans-serif;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #000;
      text-transform: uppercase;
      margin: 0 0 1mm 0;
    }
    .headline {
      font-family: "Noto Serif Malayalam", "Anek Malayalam", serif;
      font-weight: 700;
      line-height: 1.1;
      margin: 0 0 1.5mm 0;
      color: #000;
      letter-spacing: -0.02em;
      break-after: avoid;
    }
    .headline.span-3 { font-size: 20pt; }
    .headline.span-2 { font-size: 20pt; }
    .headline.span-1 { font-size: 20pt; }

    .body-columns {
      font-family: "Anek Malayalam", sans-serif;
      font-size: 8.8pt;
      line-height: 1.4;
      color: #000;
      text-align: justify;
      column-gap: 4mm;
      column-rule: 0.4pt solid rgba(0,0,0,0.25);
      hyphens: none;
      text-justify: inter-word;
      word-break: normal;
      overflow-wrap: break-word;
      line-break: loose;
      font-feature-settings: "kern" 1, "liga" 1;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      margin-top: 1.5mm;
    }
    .body-columns.cols-5 { column-count: 5; }
    .body-columns.cols-3 { column-count: 3; }
    .body-columns.cols-2 { column-count: 2; }
    .body-columns.cols-1 { column-count: 1; }

    .lead-split-wrap {
      display: flex;
      flex-direction: row;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      margin-top: 1.5mm;
    }
    .lead-left-col {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      padding-right: 2mm;
      border-right: 0.4pt solid rgba(0,0,0,0.25);
    }
    .lead-right-col {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      padding-left: 2mm;
    }
    .lead-photo-figure {
      width: 100%;
      margin: 0 0 1.2mm 0;
      display: block;
      flex-shrink: 0;
    }
    .standard-photo-figure {
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      width: 100%;
      margin: 0 0 1.5mm 0;
      display: block;
    }
    .newspaper-photo {
      width: 100%;
      object-fit: cover;
      display: block;
      filter: contrast(1.05);
    }
    .photo-caption {
      font-size: 6.8pt;
      font-style: italic;
      color: rgba(0,0,0,0.75);
      line-height: 1.15;
      margin-top: 0.6mm;
      font-family: "Inter", sans-serif;
    }

    .sheet-footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #000;
      padding-top: 1mm;
      margin-top: auto;
      font-family: "Inter", sans-serif;
      font-size: 7.5pt;
      color: #000;
    }
  </style>
</head>
<body>
  ${allPagesHtml}
</body>
</html>
  `;
}

const html = generateHtml();
const targetPath = path.join(__dirname, 'print_preview_sample.html');
fs.writeFileSync(targetPath, html, 'utf-8');
console.log('Successfully generated print preview at:', targetPath);
console.log('Total characters in HTML:', html.length);

