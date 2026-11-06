/* ==========================================================
   SITE SETTINGS & REVIEWS  —  the only file you need to edit
   ========================================================== */
window.SITE = {
  whatsapp: "2349133161475",          // digits only, with country code (no + or spaces)
  email: "fluerdebeaute@gmail.com",

  // Opening hours used by the booking form (24h clock). 0 = Sunday ... 6 = Saturday
  hours: { 0: [10, 18], other: [8, 20] },

  // --- Google Sheet reviews (see setup steps; leave "" to keep using the list below only) ---
  // 1) Pre-filled link of your Google Form (answers typed as NAME, RATING, REVIEW)
  reviewFormLink: "https://docs.google.com/forms/d/e/1FAIpQLSd8oE0bBxm1l6EWzSI76Vi3IN2nYn7VCWIAVwt7eL0PICoqyA/viewform?usp=pp_url&entry.117562555=NAME&entry.2078433803=RATING&entry.329924342=REVIEW",
  // 2) "Publish to web" CSV link of the Google Sheet that collects the form answers
  reviewsCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkm9Z-R4mOD60r4c5IJGsloMTi3hsDv6Zn79uRqs488AZoQ5MKRv5LMLchy2h5agHunSMO3H63JkXW/pub?gid=1061736117&single=true&output=csv"
};

/* Fallback testimonials. They show if the Google Sheet is empty or can't be reached,
   and fill any spare spots after the approved reviews from the sheet. */
window.REVIEWS = [
  { name: "Amarachi S.", stars: 5, text: "The best hair salon I’ve been to! My hair always looks amazing and the staff are so professional and friendly." },
  { name: "Tolu M.",     stars: 5, text: "Their makeup skills are unmatched! I felt so beautiful and confident for my event. Highly recommend!" },
  { name: "Chidinma E.", stars: 5, text: "Clean space, great service and friendly staff. I always leave feeling like a queen!" }
];
