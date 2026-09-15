// Board and College Tag Mapping & Bengali Localization
export const TAG_MAP = {
  "DB": "ঢাকা বোর্ড", "DHAKA": "ঢাকা বোর্ড",
  "Ctg.B": "চট্টগ্রাম বোর্ড", "CTG.B": "চট্টগ্রাম বোর্ড", "CTG": "চট্টগ্রাম বোর্ড", "CHITTAGONG": "চট্টগ্রাম বোর্ড", "CTG B": "চট্টগ্রাম বোর্ড",
  "CB": "কুমিল্লা বোর্ড", "COMILLA": "কুমিল্লা বোর্ড", "CUMILLA": "কুমিল্লা বোর্ড", "COM B": "কুমিল্লা বোর্ড",
  "RB": "রাজশাহী বোর্ড", "RAJSHAHI": "রাজশাহী বোর্ড", "RAJ B": "রাজশাহী বোর্ড",
  "SB": "সিলেট বোর্ড", "SYLHET": "সিলেট বোর্ড", "SYL B": "সিলেট বোর্ড",
  "JB": "যশোর বোর্ড", "JESSORE": "যশোর বোর্ড", "JASHORE": "যশোর বোর্ড", "JES B": "যশোর বোর্ড",
  "BB": "বরিশাল বোর্ড", "BARISAL": "বরিশাল বোর্ড", "BARISHAL": "বরিশাল বোর্ড", "BAR B": "বরিশাল বোর্ড",
  "Din.B": "দিনাজপুর বোর্ড", "DIN.B": "দিনাজপুর বোর্ড", "DIN": "দিনাজপুর বোর্ড", "DINAJPUR": "দিনাজপুর বোর্ড", "DIN B": "দিনাজপুর বোর্ড",
  "MB": "ময়মনসিংহ বোর্ড", "MYMENSINGH": "ময়মনসিংহ বোর্ড", "MYM B": "ময়মনসিংহ বোর্ড",
  "Madrasa": "মাদ্রাসা বোর্ড", "MADRASA": "মাদ্রাসা বোর্ড", "MAD": "মাদ্রাসা বোর্ড", "MADRASHA": "মাদ্রাসা বোর্ড", "MADRASHA B": "মাদ্রাসা বোর্ড", "DAKHIL": "দাখিল মাদ্রাসা বোর্ড",
  "TEC": "কারিগরি বোর্ড", "BTEB": "কারিগরি বোর্ড",
  "All.B": "সকল বোর্ড", "ALL.B": "সকল বোর্ড", "ALL": "সকল বোর্ড", "ALL B": "সকল বোর্ড",
  "RCC": "রাজশাহী ক্যাডেট কলেজ",
  "JCC": "ঝিনাইদহ ক্যাডেট কলেজ",
  "MCC": "মির্জাপুর ক্যাডেট কলেজ",
  "PCC": "পাবনা ক্যাডেট কলেজ",
  "FCC": "ফৌজদারহাট ক্যাডেট কলেজ",
  "SCC": "সিলেট ক্যাডেট কলেজ",
  "BCC": "বরিশাল ক্যাডেট কলেজ", "CCR": "বরিশাল ক্যাডেট কলেজ",
  "MGCC": "ময়মনসিংহ গার্লস ক্যাডেট কলেজ",
  "FGCC": "ফেনী গার্লস ক্যাডেট কলেজ",
  "JGCC": "জয়পুরহাট গার্লস ক্যাডেট কলেজ",
  "RUMC": "রাজউক উত্তরা মডেল কলেজ",
  "DRMC": "ঢাকা রেসিডেনসিয়াল মডেল কলেজ",
  "VNSC": "ভিকারুননিসা নূন স্কুল ও কলেজ",
  "ISCM": "আইডিয়াল স্কুল অ্যান্ড কলেজ",
  "ACC": "আদমজী ক্যান্টনমেন্ট কলেজ",
  "BNMPC": "বীরশ্রেষ্ঠ নূর মোহাম্মদ পাবলিক কলেজ",
  "SJHSS": "সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয়",
  "RCPC": "রাজশাহী কলেজিয়েট স্কুল",
  "CPSCR": "ক্যান্টনমেন্ট পাবলিক স্কুল ও কলেজ",
  "BCPC": "বান্দরবান ক্যান্টনমেন্ট পাবলিক কলেজ",
  "MCPC": "মিরপুর ক্যান্টনমেন্ট পাবলিক স্কুল ও কলেজ",
  "BNSC": "বাংলাদেশ নৌবাহিনী স্কুল ও কলেজ",
  "BNCP": "ক্যান্টনমেন্ট পাবলিক স্কুল ও কলেজ",
  "GLHSD": "সরকারি করোনেশন / ল্যাবরেটরি হাই স্কুল",
  "NISD": "ন্যাশনাল আইডিয়াল স্কুল",
  "MHSC": "মিরপুর ক্যান্টনমেন্ট পাবলিক স্কুল",
  "CSC": "ক্যান্টনমেন্ট পাবলিক স্কুল",
  "HC": "হলি ক্রস কলেজ",
  "RCS": "রাজশাহী কলেজিয়েট স্কুল"
};

export const TAG_MAP_UPPER = Object.fromEntries(
  Object.entries(TAG_MAP).map(([k, v]) => [k.toUpperCase(), v])
);

export const BN_DIGITS = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };

export const toBengaliNumber = (s) => String(s).replace(/[0-9]/g, d => BN_DIGITS[d] || d);

export const formatTag = (tagStr) => {
  if (!tagStr) return "";
  return tagStr
    .split(",")
    .map(single => {
      const clean = single.trim().replace(/^['"-]+|['"-]+$/g, '');
      const match = clean.match(/^([A-Za-z.\s]+?)\s*[-'"]*\s*(\d{2,4})?$/i);
      if (match) {
        const rawCode = match[1].trim().toUpperCase();
        const cleanCode = rawCode.replace(/\.+$/, '');
        const yr = match[2];
        const boardName = TAG_MAP_UPPER[rawCode] || TAG_MAP_UPPER[cleanCode] || match[1].trim();
        if (yr) {
          const fullYr = yr.length === 2 ? (parseInt(yr, 10) > 70 ? `19${yr}` : `20${yr}`) : yr;
          return `${boardName} ${toBengaliNumber(fullYr)}`;
        }
        return boardName;
      }
      return clean;
    })
    .filter(Boolean)
    .join(", ");
};
