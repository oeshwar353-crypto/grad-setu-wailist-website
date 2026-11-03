/**
 * ============================================================
 * GRADSETU WAITLIST — BULLETPROOF GOOGLE APPS SCRIPT
 * ============================================================
 */

var ADMIN_PASSKEY = "gradsetu2026";

var HEADERS = [
  "Timestamp",        // 1. IST formatted date & time
  "Pass_ID",          // 2. e.g. GS-101
  "Full_Name",        // 3. Student's name
  "WhatsApp_Number",  // 4. 10-digit Indian mobile
  "Email_ID",         // 5. Lowercase normalized email
  "College_Name",     // 6. Name of university/college
  "College_City",     // 7. City where campus is located
  "Department",       // 8. Branch of engineering/study
  "Year_Of_Study",    // 9. 1st Year, 2nd Year, etc.
  "Hometown_City",    // 10. Native city/state
  "Languages_Known",  // 11. Comma-separated list
  "Languages_Count",  // 12. Numeric count of languages
  "Referral_Code",    // 13. Unique code e.g. GS-AAR9124
  "Referred_By",      // 14. Code of referring friend (if any)
  "Referral_Count"    // 15. Total successful invites
];

/**
 * QUICK TEST FUNCTION:
 * Run this function directly inside the Apps Script editor (select 'testWrite' -> click 'Run')
 * It will prompt you to authorize permissions, then immediately append a test row into your sheet!
 */
function testWrite() {
  var sheet = getTargetSheet();
  var timestamp = getISTTimestamp();
  var testRow = [
    timestamp,
    "GS-100",
    "Founder Test Entry",
    "9876543210",
    "test@gradsetu.in",
    "IIT Bombay",
    "Mumbai, Maharashtra",
    "CSE / Computer Science",
    "4th Year",
    "Indore, Madhya Pradesh",
    "English, Hindi",
    2,
    "GS-TEST01",
    "",
    0
  ];
  sheet.appendRow(testRow);
  Logger.log("✅ SUCCESS! Test row written to sheet: " + sheet.getName());
}

/**
 * Gets the current active sheet tab (e.g. Sheet1 or whichever is open)
 */
function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  if (!sheet) {
    var sheets = ss.getSheets();
    sheet = sheets.length > 0 ? sheets[0] : ss.insertSheet("GradSetu_Waitlist");
  }
  
  // Initialize headers if row 1 is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#080D1A");
    headerRange.setFontColor("#D4AF37");
    sheet.setFrozenRows(1);
    
    for (var i = 1; i <= HEADERS.length; i++) {
      sheet.setColumnWidth(i, 160);
    }
  }
  
  return sheet;
}

function getISTTimestamp() {
  return Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a") + " IST";
}

function generatePassID(rowIndex) {
  var num = 100 + (rowIndex - 1);
  return "GS-" + num;
}

/**
 * Process a registration payload (shared between doPost and doGet)
 */
function processRegistration(data) {
  var fullName = (data.full_name || "Applicant").toString().trim();
  var email = (data.email || "").toString().trim().toLowerCase();
  var whatsapp = (data.whatsapp_number || "").toString().trim();
  var cleanPhone = whatsapp.replace(/[^0-9]/g, "").slice(-10);
  
  var sheet = getTargetSheet();
  var values = sheet.getDataRange().getValues();
  
  // Check for duplicate on Email or WhatsApp Number
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var existingPhone = (row[3] || "").toString().replace(/[^0-9]/g, "").slice(-10);
    var existingEmail = (row[4] || "").toString().trim().toLowerCase();
    
    if ((email && existingEmail === email) || (cleanPhone && existingPhone === cleanPhone)) {
      return {
        status: "success",
        isDuplicate: true,
        message: "Welcome back! Existing pass retrieved.",
        passData: {
          pass_id: row[1],
          full_name: row[2],
          whatsapp_number: row[3],
          email: row[4],
          college_name: row[5],
          college_city: row[6],
          department: row[7],
          year_of_study: row[8],
          hometown_city: row[9],
          languages_known: row[10],
          languages_count: row[11],
          referral_code: row[12],
          referred_by: row[13],
          referral_count: row[14],
          timestamp: row[0]
        }
      };
    }
  }
  
  // Append new row
  var newRowIndex = values.length + 1;
  var passId = generatePassID(newRowIndex);
  var timestamp = getISTTimestamp();
  
  var namePart = fullName.replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 3);
  if (namePart.length < 3) namePart = "GSX";
  var randPart = Math.floor(1000 + Math.random() * 9000);
  var refCode = "GS-" + namePart + randPart;
  var referredBy = (data.referred_by || data.referred_by_code || "").toString().trim();
  
  var languagesList = data.languages_list || data.languages_known || "";
  if (Array.isArray(languagesList)) {
    languagesList = languagesList.join(", ");
  }
  var languagesCount = Number(data.languages_count) || (languagesList ? languagesList.split(",").length : 1);
  
  var newRow = [
    timestamp,
    passId,
    fullName,
    whatsapp,
    email,
    (data.college_name || "").toString().trim(),
    (data.college_city || "").toString().trim(),
    (data.department || "").toString().trim(),
    (data.year_of_study || "").toString().trim(),
    (data.hometown_city || "").toString().trim(),
    languagesList,
    languagesCount,
    refCode,
    referredBy,
    0
  ];
  
  sheet.appendRow(newRow);
  
  // Increment referrer's count if valid
  if (referredBy) {
    for (var j = 1; j < values.length; j++) {
      var existingRefCode = (values[j][12] || "").toString().trim();
      if (existingRefCode && existingRefCode.toUpperCase() === referredBy.toUpperCase()) {
        var currentCount = Number(values[j][14]) || 0;
        sheet.getRange(j + 1, 15).setValue(currentCount + 1);
        break;
      }
    }
  }
  
  return {
    status: "success",
    isDuplicate: false,
    message: "Pass generated successfully!",
    passData: {
      pass_id: passId,
      full_name: fullName,
      whatsapp_number: whatsapp,
      email: email,
      college_name: data.college_name,
      college_city: data.college_city,
      department: data.department,
      year_of_study: data.year_of_study,
      hometown_city: data.hometown_city,
      languages_known: languagesList,
      languages_count: languagesCount,
      referral_code: refCode,
      referred_by: referredBy,
      referral_count: 0,
      timestamp: timestamp
    }
  };
}

/**
 * Handle POST Requests from Website Form
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    var result = processRegistration(data);
    return createJsonResponse(result);
    
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle GET Requests (Ping, Lookup, Admin, and fallback register)
 */
function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || "ping";
    
    // Fallback: registration via GET if POST is intercepted
    if (action === "register") {
      var regResult = processRegistration(params);
      return createJsonResponse(regResult);
    }
    
    var sheet = getTargetSheet();
    var values = sheet.getDataRange().getValues();
    
    if (action === "ping" || action === "count") {
      var rows = Math.max(0, values.length - 1);
      return createJsonResponse({
        status: "ready",
        service: "GradSetu Waitlist API",
        sheetName: sheet.getName(),
        totalRows: rows,
        baseCount: 79,
        totalCount: 79 + rows
      });
    }
    
    if (action === "lookup") {
      var query = (params.query || "").toString().trim().toLowerCase();
      var cleanQueryPhone = query.replace(/[^0-9]/g, "").slice(-10);
      
      for (var i = 1; i < values.length; i++) {
        var row = values[i];
        var rowPhone = (row[3] || "").toString().replace(/[^0-9]/g, "").slice(-10);
        var rowEmail = (row[4] || "").toString().trim().toLowerCase();
        
        if ((rowEmail && rowEmail === query) || (cleanQueryPhone && rowPhone === cleanQueryPhone)) {
          return createJsonResponse({
            status: "success",
            passData: {
              pass_id: row[1],
              full_name: row[2],
              whatsapp_number: row[3],
              email: row[4],
              college_name: row[5],
              college_city: row[6],
              department: row[7],
              year_of_study: row[8],
              hometown_city: row[9],
              languages_known: row[10],
              languages_count: row[11],
              referral_code: row[12],
              referred_by: row[13],
              referral_count: row[14],
              timestamp: row[0]
            }
          });
        }
      }
      
      return createJsonResponse({
        status: "not_found",
        message: "No pass found."
      });
    }
    
    if (action === "admin") {
      var passkey = params.key || "";
      if (passkey !== ADMIN_PASSKEY) {
        return createJsonResponse({
          status: "unauthorized",
          message: "Invalid admin passkey."
        });
      }
      
      var users = [];
      var uniqueColleges = {};
      var uniqueCities = {};
      var uniqueHometowns = {};
      var langCounts = {};
      var totalReferrals = 0;
      
      for (var k = 1; k < values.length; k++) {
        var r = values[k];
        var u = {
          timestamp: r[0],
          pass_id: r[1],
          full_name: r[2],
          whatsapp_number: r[3],
          email: r[4],
          college_name: r[5],
          college_city: r[6],
          department: r[7],
          year_of_study: r[8],
          hometown_city: r[9],
          languages_known: r[10],
          languages_count: r[11],
          referral_code: r[12],
          referred_by: r[13],
          referral_count: Number(r[14]) || 0
        };
        users.push(u);
        
        if (u.college_name) uniqueColleges[u.college_name.trim().toLowerCase()] = true;
        if (u.college_city) uniqueCities[u.college_city.trim().toLowerCase()] = true;
        if (u.hometown_city) uniqueHometowns[u.hometown_city.trim().toLowerCase()] = true;
        totalReferrals += u.referral_count;
        
        if (u.languages_known) {
          var langs = u.languages_known.toString().split(",");
          for (var l = 0; l < langs.length; l++) {
            var langClean = langs[l].trim();
            if (langClean) {
              langCounts[langClean] = (langCounts[langClean] || 0) + 1;
            }
          }
        }
      }
      
      return createJsonResponse({
        status: "success",
        total: users.length,
        stats: {
          totalUsers: users.length,
          uniqueColleges: Object.keys(uniqueColleges).length,
          uniqueCampusCities: Object.keys(uniqueCities).length,
          uniqueHometowns: Object.keys(uniqueHometowns).length,
          totalReferrals: totalReferrals,
          languageBreakdown: langCounts
        },
        data: users
      });
    }
    
    return createJsonResponse({ status: "error", message: "Unknown action" });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
