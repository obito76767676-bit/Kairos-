const fs = require("fs-extra");
const path = require("path");

// إعدادات التخزين
const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
const rankFile = path.join(cacheDir, "ranksystem.json");

// بيانات الرتب - 20 رتبة
const ranks = [
  { name: "🟤 وافد جديد", minMsg: 0, emoji: "🟤" },
  { name: "⚪ مستخدم جديد", minMsg: 10, emoji: "⚪" },
  { name: "🟢 عضو مبتدئ", minMsg: 30, emoji: "🟢" },
  { name: "🔵 عضو عادي", minMsg: 60, emoji: "🔵" },
  { name: "🟣 عضو متفاعل", minMsg: 100, emoji: "🟣" },
  { name: "🟡 عضو نشط", minMsg: 200, emoji: "🟡" },
  { name: "🟠 عضو مجتهد", minMsg: 350, emoji: "🟠" },
  { name: "🔴 عضو مميز", minMsg: 500, emoji: "🔴" },
  { name: "💚 نجم صاعد", minMsg: 700, emoji: "💚" },
  { name: "💙 نجم المجموعة", minMsg: 1000, emoji: "💙" },
  { name: "💜 نجم لامع", minMsg: 1500, emoji: "💜" },
  { name: "💛 نجمة ساطعة", minMsg: 2000, emoji: "💛" },
  { name: "🧡 قمر المجموعة", minMsg: 3000, emoji: "🧡" },
  { name: "❤️ شمس المنتدى", minMsg: 4000, emoji: "❤️" },
  { name: "🤍 أمير المجموعة", minMsg: 5500, emoji: "🤍" },
  { name: "🖤 أميرة المجموعة", minMsg: 7000, emoji: "🖤" },
  { name: "💝 ملك المجموعة", minMsg: 9000, emoji: "💝" },
  { name: "👑 ملكة المجموعة", minMsg: 12000, emoji: "👑" },
  { name: "🌟 أسطورة حية", minMsg: 15000, emoji: "🌟" },
  { name: "💎 أيقونة المجموعة", minMsg: 20000, emoji: "💎" }
];

// معرف المطور
const devID = "100081948980908";

module.exports.config = {
  name: "رتبة",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "Dev",
  description: "نظام الرتب التلقائي مع تغيير الكنية (20 رتبة)",
  commandCategory: "المطور",
  usages: "تشغيل / ايقاف",
  cooldowns: 5
};

// تحميل البيانات
function loadData() {
  if (!fs.existsSync(rankFile)) fs.writeJsonSync(rankFile, { 
    active: false, 
    users: {}, 
    groupSettings: {} 
  });
  return fs.readJsonSync(rankFile);
}

// حفظ البيانات
function saveData(data) {
  fs.writeJsonSync(rankFile, data, { spaces: 2 });
}

// جلب الرتبة بناءً على عدد الرسائل
function getRank(msgCount) {
  let userRank = ranks[0];
  for (const rank of ranks) {
    if (msgCount >= rank.minMsg) userRank = rank;
  }
  return userRank;
}

// نظام تغيير الكنية حسب الرتبة
async function updateNickname(api, threadID, userID, msgCount, groupSettings) {
  try {
    const rank = getRank(msgCount);
    const memberInfo = await api.getThreadInfo(threadID);
    const member = memberInfo.participantIDs.find(id => id === userID);
    if (!member) return;
    
    let nickname = `[${rank.emoji}] ${rank.name}`;
    
    if (groupSettings[threadID]?.customPrefix) {
      nickname = `${groupSettings[threadID].customPrefix} | ${nickname}`;
    }
    
    await api.changeNickname(nickname, threadID, userID);
    return true;
  } catch (e) {
    console.error("خطأ في تغيير الكنية:", e);
    return false;
  }
}

// معالجة الرسائل
module.exports.handleEvent = async function({ api, event }) {
  const data = loadData();
  if (!data.active) return;
  
  const { threadID, senderID, body } = event;
  if (!body || senderID === api.getCurrentUserID()) return;
  
  // التأكد من أن المجموعة مفعلة
  if (!data.groupSettings[threadID]?.active) return;
  
  // تتبع الرسائل للمستخدم
  const userKey = `${threadID}_${senderID}`;
  if (!data.users[userKey]) {
    data.users[userKey] = {
      msgCount: 0,
      lastActive: Date.now(),
      firstSeen: Date.now()
    };
  }
  
  // زيادة عدد الرسائل
  data.users[userKey].msgCount++;
  data.users[userKey].lastActive = Date.now();
  
  // التحقق من الرتبة كل 10 رسائل لتقليل الضغط
  if (data.users[userKey].msgCount % 10 === 0) {
    await updateNickname(api, threadID, senderID, data.users[userKey].msgCount, data.groupSettings);
  }
  
  saveData(data);
};

// الأمر الرئيسي
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  // التحقق من المطور
  if (String(senderID) !== devID) {
    return api.sendMessage("❌ هذا الأمر مخصص للمطور فقط.", threadID, messageID);
  }
  
  const data = loadData();
  const cmd = args[0]?.toLowerCase();
  
  switch(cmd) {
    case "تشغيل":
    case "تفعيل":
      if (data.active) {
        return api.sendMessage("✅ النظام يعمل بالفعل!", threadID, messageID);
      }
      data.active = true;
      if (!data.groupSettings[threadID]) {
        data.groupSettings[threadID] = { active: true };
      } else {
        data.groupSettings[threadID].active = true;
      }
      saveData(data);
      
      // تغيير كنية المطور
      await updateNickname(api, threadID, senderID, 99999, data.groupSettings);
      
      return api.sendMessage(
        `✅ تم تفعيل نظام الرتب بنجاح!\n\n📊 الإحصائيات:\n• المستخدمين المسجلين: ${Object.keys(data.users).length}\n• المجموعات المفعلة: ${Object.keys(data.groupSettings).length}\n\n🏆 قائمة الرتب (20 رتبة):\n${ranks.map((r, i) => `${i + 1}. ${r.emoji} ${r.name} - ${r.minMsg} رسالة`).join('\n')}`,
        threadID, 
        messageID
      );
      
    case "ايقاف":
    case "إيقاف":
      if (!data.active) {
        return api.sendMessage("⚠️ النظام غير مفعل أصلاً.", threadID, messageID);
      }
      data.active = false;
      saveData(data);
      return api.sendMessage("✅ تم إيقاف نظام الرتب.", threadID, messageID);
      
    case "تفعيل_المجموعة":
      data.groupSettings[threadID] = { 
        ...data.groupSettings[threadID], 
        active: true 
      };
      saveData(data);
      return api.sendMessage("✅ تم تفعيل الرتب في هذه المجموعة.", threadID, messageID);
      
    case "تعطيل_المجموعة":
      if (data.groupSettings[threadID]) {
        data.groupSettings[threadID].active = false;
      }
      saveData(data);
      return api.sendMessage("✅ تم تعطيل الرتب في هذه المجموعة.", threadID, messageID);
      
    case "حالة":
      const status = data.active ? "🟢 مفعل" : "🔴 معطل";
      const groupActive = data.groupSettings[threadID]?.active ? "🟢 مفعلة" : "🔴 معطلة";
      return api.sendMessage(
        `📊 حالة نظام الرتب:\n\n• النظام العام: ${status}\n• هذه المجموعة: ${groupActive}\n• إجمالي المستخدمين: ${Object.keys(data.users).length}\n• إجمالي المجموعات: ${Object.keys(data.groupSettings).length}`,
        threadID, 
        messageID
      );
      
    case "رتبتي":
      const userKey = `${threadID}_${senderID}`;
      if (!data.users[userKey]) {
        return api.sendMessage("📭 لا توجد بيانات لك بعد.", threadID, messageID);
      }
      const rank = getRank(data.users[userKey].msgCount);
      const currentIndex = ranks.indexOf(rank);
      const nextRank = ranks[currentIndex + 1];
      const neededMsgs = nextRank ? nextRank.minMsg - data.users[userKey].msgCount : 0;
      
      return api.sendMessage(
        `🏆 رتبتك الحالية:\n\n${rank.emoji} ${rank.name}\n📊 عدد رسائلك: ${data.users[userKey].msgCount}\n${nextRank ? `📈 تحتاج ${neededMsgs} رسالة للوصول إلى ${nextRank.emoji} ${nextRank.name}` : '🎉 لقد وصلت لأعلى رتبة!'}`,
        threadID, 
        messageID
      );
      
    default:
      return api.sendMessage(
        `📖 تعليمات الأمر:\n\n• ${global.config.PREFIX}رتبة تشغيل - تفعيل النظام\n• ${global.config.PREFIX}رتبة ايقاف - إيقاف النظام\n• ${global.config.PREFIX}رتبة حالة - عرض الحالة\n• ${global.config.PREFIX}رتبة رتبتي - عرض رتبتك\n• ${global.config.PREFIX}رتبة تفعيل_المجموعة\n• ${global.config.PREFIX}رتبة تعطيل_المجموعة`,
        threadID, 
        messageID
      );
  }
};
