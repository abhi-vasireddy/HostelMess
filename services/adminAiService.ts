/**
 * Admin AI Service
 *
 * Primary engine: **local analysis** — generates intelligent answers directly from
 * Firebase data using template-based natural language generation. No API keys
 * needed, no quotas, instant responses.
 *
 * Optional upgrade: If VITE_GEMINI_API_KEY is configured and has available quota,
 * the service can use Gemini for richer natural-language responses.
 *
 * Architecture:
 *   processQuery(query, history)
 *     → classifyIntent(query)          // What does the user want?
 *     → fetchDataForIntent(intent)     // Fetch only relevant Firebase data
 *     → generateAnswer(intent, data)   // Produce human-readable response
 *       → try Gemini if available      // Enhanced NL if key works
 *       → fallback to local engine     // Always works, no dependencies
 */
import {
  fetchAllUsers,
  fetchUserStats,
  fetchTodayFeedback,
  fetchWeekFeedback,
  fetchMonthFeedback,
  fetchFeedbackInRange,
  fetchAllFeedback,
  aggregateFeedbackStats,
  fetchTopLowestRatedDishes,
  fetchComplaintStats,
  fetchComplaints,
  fetchSuggestions,
  fetchWeeklyMenu,
  fetchTodayMenu,
  fetchMenuForDay,
  fetchFeedbackByBlock,
  fetchWeekComparison,
  fetchMonthlyReportData,
  fetchCanteenItems,
} from './firebaseDataService';
import type { Feedback, HostelComplaint } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export type ChartKind = 'bar' | 'horizontalBar' | 'pie' | 'table';

export interface TableColumn {
  key: string;
  label: string;
}

export interface ChartConfig {
  kind: ChartKind;
  title: string;
  data: ChartDataPoint[];
  /** Optional secondary dataset for grouped/comparison bars */
  secondaryData?: ChartDataPoint[];
  /** Table rows for 'table' kind */
  columns?: TableColumn[];
  rows?: Record<string, string>[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  charts?: ChartConfig[];
}

export interface AIResponse {
  text: string;
  error?: string;
  charts?: ChartConfig[];
}

// ─── Intent Router ───────────────────────────────────────────────────────────

type Intent =
  | 'user_count'
  | 'active_users'
  | 'user_search'
  | 'dish_search'
  | 'today_feedback_count'
  | 'today_avg_rating'
  | 'highest_meal_week'
  | 'lowest_meal_week'
  | 'top_dishes'
  | 'lowest_dishes'
  | 'block_feedback'
  | 'most_complaints_day'
  | 'common_complaints'
  | 'today_summary'
  | 'week_insights'
  | 'unusual_trends'
  | 'dishes_to_improve'
  | 'most_liked'
  | 'weekly_report'
  | 'monthly_report'
  | 'week_comparison'
  | 'day_menu'
  | 'suggestions_count'
  | 'suggestion_dishes'
  | 'feedback_count'
  | 'canteen_items'
  | 'general_analysis'
  | 'unknown';

function classifyIntent(query: string): {
  intent: Intent;
  timeframe?: 'today' | 'week' | 'month' | 'all';
  mealFocus?: string;
  dayFocus?: string;
  searchName?: string;
  searchDish?: string;
  complaintDetail?: string;
} {
  const q = query.toLowerCase().trim();

  // Extract any mentioned meal type for sub-routing
  const mealRegexMatch = q.match(/\b(breakfast|lunch|snacks?|dinner)\b/i);
  const breakFastMatch = !mealRegexMatch && q.match(/\bbreak\s+fast\b/i);
  const mealMatch = mealRegexMatch || breakFastMatch;
  const mealFocus = mealMatch
    ? breakFastMatch ? 'breakfast' : mealMatch[1].replace(/snack$/, 'Snacks')
    : undefined;
  const mealCapitalized = mealFocus
    ? mealFocus.charAt(0).toUpperCase() + mealFocus.slice(1)
    : undefined;

  // Extract any mentioned day name or day reference
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'tomorrow'];
  const dayNamePattern = dayNames.join('|');
  let dayFocus: string | undefined;

  // "day after tomorrow" — 2 days ahead
  const dayAfterMatch = (typeof q === 'string' && q.match(/day\s+after\s+tom+o?r+o?w?/i));
  if (dayAfterMatch) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date();
    d.setDate(d.getDate() + 2);
    dayFocus = days[d.getDay()];
  }

  // "tomorrow" (with common typos) — 1 day ahead
  if (!dayFocus) {
    const tommMatch = (typeof q === 'string') && q.match(/\btom+o?r+o?w\b/i);
    if (tommMatch) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const d = new Date();
      d.setDate(d.getDate() + 1);
      dayFocus = days[d.getDay()];
    }
  }

  // "day before yesterday" — 2 days back
  const dayBeforeMatch = (typeof q === 'string' && q.match(/day\s+before\s+yesterda?y?/i));
  if (dayBeforeMatch) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date();
    d.setDate(d.getDate() - 2);
    dayFocus = days[d.getDay()];
  }

    const dayMatch = !dayBeforeMatch && !dayAfterMatch && q.match(new RegExp(`\\b(${dayNamePattern}|yesterday)\\b`));
  if (dayMatch) {
    const raw = dayMatch[1];
    if (raw === 'yesterday') {
      // Calculate yesterday's actual day name
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const d = new Date();
      d.setDate(d.getDate() - 1);
      dayFocus = days[d.getDay()];
    } else {
      dayFocus = raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }

  // ── Day-specific menu questions (must come before "today" patterns) ──
  // "what is yesterday dinner", "what is monday dinner", "[day] [meal] menu"
  if (dayFocus && mealFocus && !q.includes('today')) {
    return { intent: 'day_menu', dayFocus, mealFocus: mealCapitalized };
  }

  if (/canteen/i.test(q)) {
    const itemMatch = q.match(/is\s+((?!canteen)\w+(?:\s+\w+)?)\s+available/i) || q.match(/(?:is\s+there|do\s+you\s+have)\s+((?!canteen)\w+(?:\s+\w+)?)/i) || q.match(/(?:has|got|sell)\s+((?!canteen)\w+(?:\s+\w+)?)/i);
    const searchItem = itemMatch?.[1]?.trim() || '';
    return { intent: 'canteen_items', searchName: searchItem || undefined };
  }
  // "what was the menu on monday", "what is on monday for dinner"
  if (dayFocus && (/(?:menu|dinner|lunch|breakfast|snacks?|eat|food|serv)/i.test(q) || /what.*on|what.*for/i.test(q))) {
    return { intent: 'day_menu', dayFocus, mealFocus: mealCapitalized };
  }

  // ── User search — "anyone named John Doe", "find user X", etc. ──
  // Also detects email-based lookups: "get details of student@hostel.com"
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const emailMatch = q.match(emailPattern);
  if (
    emailMatch &&
    /detail|info|about|find|search|user|who|look|get|fetch|show/i.test(q)
  ) {
    return { intent: 'user_search', searchName: emailMatch[1] };
  }

  // Extract the search name from the query for downstream use
  const nameSearchMatch = q.match(
    /(?:name\s+(?:of\s+)?|named\s+|called\s+|user\s+(?:named\s+|called\s+|with\s+name\s+)?)(.+?)(?:\s+in\s+.+)?$/i
  );
  if (
    /anyone\s+(named|called|with\s+name)|find\s+(a\s+)?user|search\s+(for\s+)?user|is\s+there\s+(a|any)\s+user|look\s+up\s+user/i.test(q) ||
    (nameSearchMatch && (/\buser\b|\banyone\b|\bperson\b|\bfind\b|\bsearch\b|\bname\b|\blookup\b|\bis\s+there\b/i.test(q)))
  ) {
    return { intent: 'user_search', searchName: nameSearchMatch ? nameSearchMatch[1].trim() : '' };
  }

  // ── Dish / menu item search — "when is chicken in the week", "how many times X", etc. ──
  // Extract the food item from clear patterns
  // Clean up a captured dish term by removing trailing noise words
  const cleanDishTerm = (raw: string): string => {
    return raw.replace(/\s+(will|is|be|was|are|being|been|have|has|had|in|on|at|for|to|the|a|an|this|that|these|those|there|it|they|he|she|we|you)\s*$/i, '').trim();
  };

  const dishPatterns = [
    /whenis\s+(\w+(?:\s+\w+)?)/i,                    // "whenis chicken" (no space)
    /when\s+is\s+(\w+(?:\s+\w+)?)\s+in\s+/i,
    /when\s+is\s+(\w+(?:\s+\w+)?)\s*$/i,           // "when is chicken" (end of input)
    /on\s+which\s+date\s+(?:did|was|is|does)\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,  // "on which date did Gravy come"
    /what\s+date\s+(?:did|was|is)\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,           // "what date was Gravy served"
    /when\s+(?:did|was|is)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:served|come|available)/i, // "when did Gravy come"
    /how\s+many\s+times\s+(?:(?:is|does)\s+)?(\w+(?:\s+\w+){0,2})\s+/i,  // up to 3 words
    /where\s+is\s+(\w+(?:\s+\w+)?)\s+/i,
    /how\s+often\s+(?:is\s+)?(\w+(?:\s+\w+)?)\s+/i,
    /is\s+(\w+(?:\s+\w+)?)\s+(?:available|there|served|on\s+the\s+menu)/i,
    /does\s+(\w+(?:\s+\w+)?)\s+appear/i,
  ];
  let dishTerm: string | undefined;
  for (const pattern of dishPatterns) {
    const m = q.match(pattern);
    if (m && m[1] && m[1].trim().length > 1) {
      dishTerm = cleanDishTerm(m[1]);
      if (dishTerm.length > 0) break;
    }
  }
  if (dishTerm) {
    return { intent: 'dish_search', searchDish: dishTerm };
  }
  // Also catch bare "X in the week" patterns (no leading verb)
  const bareDishMatch = q.match(/^(.+?)\s+in\s+(the\s+)?week/i);
  if (bareDishMatch && bareDishMatch[1].trim().length > 2 && !q.includes('what is')) {
    return { intent: 'dish_search', searchDish: bareDishMatch[1].trim() };
  }

  // ── Meal list for the entire week — "give me snacks list of the week", "list of dinner this week" ──
  // ── Today's menu for a specific meal — "what is today's dinner menu", "today breakfast" ──
  if (/today/i.test(q) && mealFocus && /menu/i.test(q)) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];
    return { intent: 'day_menu', dayFocus: todayName, mealFocus: mealCapitalized };
  }

    if (mealFocus && (/list|items|menu|schedule|what.*this week/i.test(q))) {
    return { intent: 'day_menu', dayFocus: '__all__', mealFocus: mealCapitalized };
  }

  // ── Full menu request — "give me the whole menu", "full menu", "weekly menu" ──
  if (/(?:whole|full|complete|entire|week|weekly)\s+menu|menu\s+(?:list|schedule|items)|menu.*week|week.*menu/i.test(q)) {
    return { intent: 'day_menu', dayFocus: '__all__' };
  }

  // ── Specific meal review / rating questions (must come before catch-alls) ──
  // "what is the breakfast review today", "how is lunch today", "dinner rating today"
  if (
    (mealFocus && /review|rating|how is|how was|what.*think/i.test(q)) ||
    /what.*(review|rating).*today/i.test(q) ||
    /how (is|was).*(today|this morning|afternoon|evening)/i.test(q)
  ) {
    return { intent: 'today_avg_rating', timeframe: 'today', mealFocus: mealCapitalized };
  }

  // "what is today dinner", "what's for dinner today", "today's breakfast menu"
  if (
    /what.*today.*(?:breakfast|lunch|snacks?|dinner)|today.*(?:breakfast|lunch|snacks?|dinner)|today.*menu/i.test(q)
  ) {
    return { intent: 'today_avg_rating', timeframe: 'today', mealFocus: mealCapitalized };
  }

  // ── User count ──
  if (/how many users|total users|registered users|user count/i.test(q))
    return { intent: 'user_count' };

  // ── Active users ──
  if (/active users|how many active|currently active/i.test(q))
    return { intent: 'active_users' };

  // ── Today's feedback count ──
  if (/feedback.*today|today.*feedback|how many feedback.*today/i.test(q))
    return { intent: 'today_feedback_count', timeframe: 'today' };

  // ── Today's average rating ──
  if (/today.*(average|avg).*rating|(average|avg).*rating.*today|what.*today.*rating/i.test(q))
    return { intent: 'today_avg_rating', timeframe: 'today', mealFocus: mealCapitalized };

  // ── Weekly meal ratings ──
  if (/highest.*(meal|rating).*week|best.*meal|top.*(meal|rated).*week/i.test(q))
    return { intent: 'highest_meal_week', timeframe: 'week' };

  if (/lowest.*(meal|rating).*week|worst.*meal/i.test(q))
    return { intent: 'lowest_meal_week', timeframe: 'week' };

  // ── Dish rankings ──
  if (/top.*(dish|rated)|highest.*(dish|rated)|best.*dish|best.*menu/i.test(q))
    return { intent: 'top_dishes' };

  if (/lowest.*(dish|rated)|bottom.*dish|worst.*dish/i.test(q))
    return { intent: 'lowest_dishes' };

  // ── Block feedback ──
  if (/hostel.*block|block.*feedback|which.*block|most.*feedback.*block/i.test(q))
    return { intent: 'block_feedback' };

  // ── Specific complaint type — "show me General Maintenance: Wall damage all complaints" or "Give me the General Maintenance complaints" ──
  // Only triggers when query has both "complaint" and a known complaint category keyword
  const complaintCategoryKeywords = /General|Plumbing|Carpentry|Gym|Electric|Cleaning|Food|Room|Washroom|Toilet|Bed|Fan|Light|Window|Door|Furniture|WiFi|Internet|Water|Security|Noise|Pest|Maintenance|Wall|Broken|Leak|Damage|Repair/i;
  if (q.includes(':') && /complaint/i.test(q)) {
    // Colon pattern: "General Maintenance: Wall damage all complaints"
    const colonIdx = q.indexOf(':');
    const preColon = q.slice(0, colonIdx);
    const lastThe = preColon.lastIndexOf('the ');
    const phraseStart = lastThe >= 0 ? lastThe + 4 : 0;
    const typeBefore = q.slice(phraseStart, colonIdx).trim();
    const postColon = q.slice(colonIdx + 1).replace(/\s*complaint.*$/i, '').trim();
    const compDetail = postColon
      ? typeBefore + ': ' + postColon.replace(/\s+(all|the|any|every|show|me|list|get|fetch)\s*$/i, '')
      : typeBefore;
    if (compDetail.length > 5) {
      return { intent: 'common_complaints', complaintDetail: compDetail };
    }
  }
  if (complaintCategoryKeywords.test(q) && /complaint/i.test(q)) {
    // Plain text: "General Maintenance complaints" → extract text before "complaint"
    const beforeComplaint = q.replace(/\s*complaint.*$/i, '').trim();
    const lastThe = beforeComplaint.lastIndexOf('the ');
    const compDetail = (lastThe >= 0 ? beforeComplaint.slice(lastThe + 4) : beforeComplaint)
      .replace(/\s+(all|show|me|get|list|fetch)\s*$/i, '').trim();
    if (compDetail.length > 3) {
      return { intent: 'common_complaints', complaintDetail: compDetail };
    }
  }
  // ── Complaints ──
  if (/most.*(complaint|complaints).*day|which.*day.*(complaint|complain)/i.test(q))
    return { intent: 'most_complaints_day' };

  if (/common.*(complaint|complaints|issues)|what.*students.*complain/i.test(q))
    return { intent: 'common_complaints' };

  // "get all complaints", "show hostel complaints", "list complaints"
  if (/(?:get|show|all|list|fetch).*(?:hostel\s+)?complaint|complaint.*(?:list|all|get|show)|hostel.*complaint/i.test(q))
    return { intent: 'common_complaints' };

  // ── Today summary ──
  if (/summarize.*today|today.*summary|summary.*feedback/i.test(q))
    return { intent: 'today_summary', timeframe: 'today' };

  // ── Week insights ──
  if (
    /week.*(insight|analysis|data)|this week/i.test(q) &&
    !q.includes('report') &&
    !q.includes('compar')
  )
    return { intent: 'week_insights', timeframe: 'week' };

  // ── Unusual trends ──
  if (/unusual|trend|anomaly|pattern|noticed/i.test(q))
    return { intent: 'unusual_trends' };

  // ── Dishes to improve ──
  if (
    /dishes.*(improve|bad|worst|better)|which.*dish.*(improve|change)/i.test(q)
  )
    return { intent: 'dishes_to_improve' };

  // ── Most liked ──
  if (/most.*(like|popular|favorite|liked)|menu.*(like|popular)/i.test(q))
    return { intent: 'most_liked', mealFocus: mealCapitalized };

  // ── Reports ──
  if (/weekly.*(summary|report|analytics)|generate.*weekly/i.test(q))
    return { intent: 'weekly_report', timeframe: 'week' };

  if (/monthly.*(report|summary)|generate.*monthly/i.test(q))
    return { intent: 'monthly_report', timeframe: 'month' };

  if (/compare.*week|week.*compar|last week.*this week/i.test(q))
    return { intent: 'week_comparison' };

  // ── General analysis catch-all (only matches broad requests, not specific "what is" questions) ──
  if (
    /^(analyze|give me|show me).*|overview|trend|stats|statistics|data|tell me about|what.*(happening|going)|how.*(overall|in general)/i.test(q)
  )
    return { intent: 'general_analysis' };

  // ── "what is chicken" — detect dish queries before the catch-all ──
  const whatIsMatch = q.match(/^what\s+is\s+(.+?)\s*\??$/i);
  const whatIsWord = whatIsMatch ? whatIsMatch[1].trim() : '';
  if (whatIsWord && whatIsWord.length > 1 && whatIsWord.length < 30) {
    // Only treat as dish search if the word isn't a day name or system term
    const notDish = /\b(today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|user|feedback|rating|complaint|menu|the)\b/i;
    if (!notDish.test(whatIsWord)) {
      return { intent: 'dish_search', searchDish: whatIsWord };
    }
  }

  // ── "based on suggestions which dish", "suggestions saying to change" — cross-ref with dish names ──
  if (/suggestion.*(?:dish|change|improve|replace|remove|fix|modify|which)|(?:dish|item).*suggestion/i.test(q))
    return { intent: 'suggestion_dishes' };

  // ── Suggestions count — "how many suggestions", "suggestions in past week", etc. ──
  if (/suggestion/i.test(q)) {
    const hasWeek = /\bweek\b/i.test(q);
    const hasMonth = /\bmonth\b|\b30\s*day/i.test(q);
    const hasDay = /\b(?:24\s*hr|today|yesterday)\b/i.test(q);
    const hasPast = /\b(past|last|previous)\b/i.test(q);
    const hasNumber = /\b\d+\b/.test(q);
    const timeframe = hasMonth ? 'month' : hasDay ? 'day' : hasWeek && (hasPast || hasNumber) ? 'week' : hasWeek ? 'week' : 'all';
    return { intent: 'suggestions_count', timeframe };
  }

  // ── Feedback count with timeframe — "how many feedback in past week", "feedback from 1 week" ──
  if (/feedback/i.test(q) && /(?:how many|count|total|number|past|last|week|month)/i.test(q)) {
    const hasWeek = /\bweek\b|\b7\s*day/i.test(q);
    const hasMonth = /\bmonth\b|\b30\s*day/i.test(q);
    const hasDay = /\b(?:24\s*hr|today|yesterday)\b/i.test(q);
    const hasPast = /\b(past|last|previous)\b/i.test(q);
    const timeframe = hasMonth ? 'month' : hasDay ? 'day' : hasWeek && (hasPast || /\b\d+\b/.test(q)) ? 'week' : hasWeek ? 'week' : 'all';
    return { intent: 'feedback_count', timeframe };
  }

  // ── "per dish", "per item", "for each", "each dish" — per-dish breakdown ──
  if (/per\s+(dish|item)|for\s+each|each\s+(dish|item)|dish\s+level|by\s+dish|item.?wise|dish.?wise/i.test(q))
    return { intent: 'top_dishes' };

  // ── Last resort: specific "what is", "how many", "show", "which", "list", "explain" questions ──
  // that didn't match anything more specific above
  if (/how many|what is|what are|show|list|which|give me|tell me|explain/i.test(q))
    return { intent: 'general_analysis' };

  return { intent: 'unknown' };
}

// ─── Data Fetcher ────────────────────────────────────────────────────────────

async function fetchDataForIntent(
  intent: Intent,
  mealFocus?: string,
  dayFocus?: string,
  searchName?: string,
  searchDish?: string,
  timeframe?: string
): Promise<{ context: string; data: any }> {
  switch (intent) {
    // ── Dish / menu item search ──
    case 'dish_search': {
      const [menu, feedback] = await Promise.all([fetchWeeklyMenu(), fetchAllFeedback()]);
      const term = (searchDish || '').toLowerCase().replace(/^the\s+/, '').replace(/[\s\-—–].*/s, '').trim();
      interface MenuHit {
        day: string;
        mealType: string;
        dishName: string;
        isVeg: boolean;
        type: 'menu';
      }
      interface FeedbackHit {
        date: string;
        mealType: string;
        dishName: string;
        rating: number;
        comment: string;
        userName: string;
        type: 'feedback';
      }
      const hits: MenuHit[] = [];
      const feedbackHits: FeedbackHit[] = [];
      const mealKeys = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
      for (const day of menu) {
        for (const mk of mealKeys) {
          const dishes: any[] = (day as any)[mk] || (day as any)[mk.charAt(0).toUpperCase() + mk.slice(1)] || [];
          for (const d of dishes) {
            if (d.name && d.name.toLowerCase().includes(term)) {
              hits.push({ day: day.day, mealType: mk, dishName: d.name, isVeg: d.isVeg !== false, type: 'menu' });
            }
          }
        }
      }
      for (const fb of feedback) {
        if (fb.dishName && fb.dishName.toLowerCase().includes(term)) {
          feedbackHits.push({
            date: fb.date,
            mealType: fb.mealType,
            dishName: fb.dishName,
            rating: fb.rating,
            comment: fb.comment || '',
            userName: fb.userName,
            type: 'feedback',
          });
        }
      }
      const uniqueDays = [...new Set(hits.map((h) => h.day))];
      return {
        context: `Search for "${searchDish}" in menu and feedback`,
        data: { query: searchDish, menuHits: hits, feedbackHits, hitCount: hits.length, dayCount: uniqueDays.length, fbCount: feedbackHits.length },
      };
    }

    // ── User search ──
    case 'user_search': {
      const allUsers = await fetchAllUsers();
      const term = (searchName || '').toLowerCase();
      const matches = allUsers.filter(
        (u) =>
          u.displayName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
      return {
        context: `User search for "${searchName}"`,
        data: { query: searchName, matches, total: allUsers.length },
      };
    }

    // ── Day-specific menu ──   }

    case 'day_menu': {
      if (dayFocus === '__all__') {
        // Fetch all days and filter by meal type if specified
        const fullMenu = await fetchWeeklyMenu();
        return {
          context: mealFocus ? `${mealFocus} across the week` : 'Full weekly menu',
          data: { menu: fullMenu, mealFocus, dayFocus: '__all__' },
        };
      }
      const menuForDay = await fetchMenuForDay(dayFocus || 'Monday');
      return {
        context: `${dayFocus}'s Menu`,
        data: { menu: menuForDay, mealFocus, dayFocus },
      };
    }

    case 'user_count':
    case 'active_users': {
      const stats = await fetchUserStats();
      return { context: 'User Statistics', data: stats };
    }

    case 'today_feedback_count':
    case 'today_avg_rating': {
      const [feedback, menu] = await Promise.all([
        fetchTodayFeedback(),
        fetchTodayMenu(),
      ]);
      const stats = aggregateFeedbackStats(feedback);
      return {
        context: mealFocus
          ? `Today's ${mealFocus} Feedback`
          : "Today's Feedback",
        data: { feedbackStats: stats, todayMenu: menu, mealFocus },
      };
    }

    case 'highest_meal_week':
    case 'lowest_meal_week':
    case 'week_insights':
    case 'weekly_report': {
      const feedback = await fetchWeekFeedback();
      const stats = aggregateFeedbackStats(feedback);
      return { context: "This Week's Feedback", data: { feedbackStats: stats } };
    }

    case 'top_dishes':
    case 'lowest_dishes':
    case 'dishes_to_improve':
    case 'most_liked': {
      const { top, lowest } = await fetchTopLowestRatedDishes(10, mealFocus);
      return { context: 'Dish Ratings', data: { topRated: top, lowestRated: lowest, mealFocus } };
    }

    case 'block_feedback': {
      const blockData = await fetchFeedbackByBlock();
      return { context: 'Feedback by Hostel Block', data: blockData };
    }

    case 'most_complaints_day':
    case 'common_complaints': {
      const [stats, allComplaints] = await Promise.all([fetchComplaintStats(), fetchComplaints()]);
      return { context: 'Complaint Statistics', data: { ...stats, allComplaints } };
    }

    case 'today_summary': {
      const [feedback, menu, complaints] = await Promise.all([
        fetchTodayFeedback(),
        fetchTodayMenu(),
        fetchComplaintStats(),
      ]);
      const fbStats = aggregateFeedbackStats(feedback);
      const todayStr = new Date().toISOString().split('T')[0];
      return {
        context: "Today's Complete Summary",
        data: {
          feedbackStats: fbStats,
          todayMenu: menu,
          totalComplaintsToday: complaints.byDate[todayStr] || 0,
        },
      };
    }

    case 'unusual_trends': {
      const [allFeedback, complaints, suggestions] = await Promise.all([
        fetchAllFeedback(),
        fetchComplaintStats(),
        fetchSuggestions(),
      ]);
      return {
        context: 'All Data for Trend Analysis',
        data: {
          feedbackStats: aggregateFeedbackStats(allFeedback),
          complaintStats: complaints,
          suggestionCount: suggestions.length,
        },
      };
    }

    case 'monthly_report': {
      const report = await fetchMonthlyReportData();
      return { context: 'Monthly Report Data', data: report };
    }

    case 'week_comparison': {
      const comparison = await fetchWeekComparison();
      return { context: 'Week-over-Week Comparison', data: comparison };
    }

    case 'suggestions_count': {
      const allSuggestions = await fetchSuggestions();
      const now = Date.now();
      const cutoff =
        timeframe === 'week'
          ? now - 7 * 24 * 60 * 60 * 1000
          : timeframe === 'month'
          ? now - 30 * 24 * 60 * 60 * 1000
          : timeframe === 'day'
          ? now - 24 * 60 * 60 * 1000
          : 0;
      const filtered = cutoff > 0
        ? allSuggestions.filter((s) => s.timestamp >= cutoff)
        : allSuggestions;
      return { context: 'Suggestions Data', data: { suggestions: filtered, total: allSuggestions.length, timeframe: timeframe || 'all' } };
    }

    case 'canteen_items': {
      const items = await fetchCanteenItems();
      const filtered = searchName ? items.filter(i => i.name.toLowerCase().includes(searchName.toLowerCase())) : items;
      return { context: 'Canteen Items', data: { items: filtered, all: items, searchName } };
    }

    case 'suggestion_dishes': {
      const [allSuggestions, weeklyMenu, feedback] = await Promise.all([
        fetchSuggestions(),
        fetchWeeklyMenu(),
        fetchAllFeedback(),
      ]);
      const menuDishNames = new Set<string>();
      const mealKeys = ['breakfast', 'lunch', 'snacks', 'dinner', 'Breakfast', 'Lunch', 'Snacks', 'Dinner'];
      for (const day of weeklyMenu) {
        for (const key of mealKeys) {
          const dishes = (day as any)[key] || [];
          for (const d of dishes) {
            if (d.name) menuDishNames.add(d.name.toLowerCase());
          }
        }
      }
      for (const f of feedback) {
        if (f.dishName) menuDishNames.add(f.dishName.toLowerCase());
      }
      const POSITIVE_WORDS = ['good', 'great', 'nice', 'love', 'delicious', 'amazing', 'best', 'super', 'yummy', 'tasty', 'wonderful', 'fantastic', 'excellent', 'awesome', 'perfect'];
      const NEGATIVE_WORDS = ['change', 'improve', 'bad', 'worse', 'terrible', 'remove', 'replace', 'fix', 'avoid', 'hate', 'poor', 'awful', 'boring', 'bland'];
      const mentionedDishes = new Map<string, { count: number; texts: string[]; positive: number; negative: number }>();
      for (const sg of allSuggestions) {
        if (!sg.text) continue;
        const textLower = sg.text.toLowerCase();
        for (const dishName of menuDishNames) {
          if (textLower.includes(dishName)) {
            if (!mentionedDishes.has(dishName)) {
              mentionedDishes.set(dishName, { count: 0, texts: [], positive: 0, negative: 0 });
            }
            const entry = mentionedDishes.get(dishName)!;
            entry.count++;
            if (entry.texts.length < 3) {
              entry.texts.push(sg.text);
            }
            const hasPos = POSITIVE_WORDS.some((w) => textLower.includes(w));
            const hasNeg = NEGATIVE_WORDS.some((w) => textLower.includes(w));
            if (hasPos && !hasNeg) entry.positive++;
            else if (hasNeg && !hasPos) entry.negative++;
          }
        }
      }
      const dishResults = [...mentionedDishes.entries()]
        .map(([name, info]) => ({ name, ...info }))
        .sort((a, b) => b.count - a.count);
      return {
        context: 'Suggestion Dish Analysis',
        data: { dishResults, totalSuggestions: allSuggestions.length },
      };
    }

    case 'feedback_count': {
      const allFeedbacks = await fetchAllFeedback();
      const now = Date.now();
      const cutoff =
        timeframe === 'week'
          ? now - 7 * 24 * 60 * 60 * 1000
          : timeframe === 'month'
          ? now - 30 * 24 * 60 * 60 * 1000
          : timeframe === 'day'
          ? now - 24 * 60 * 60 * 1000
          : 0;
      const todayStr = new Date().toISOString().split('T')[0];
      const cutoffDate = cutoff > 0
        ? new Date(cutoff).toISOString().split('T')[0]
        : '2000-01-01';
      const filtered = cutoff > 0
        ? allFeedbacks.filter((f) => f.date >= cutoffDate && f.date <= todayStr)
        : allFeedbacks;
      return { context: 'Feedback Data', data: { feedbacks: filtered, total: allFeedbacks.length, timeframe: timeframe || 'all' } };
    }

    case 'general_analysis': {
      const [users, feedback, complaints] = await Promise.all([
        fetchUserStats(),
        fetchAllFeedback(),
        fetchComplaintStats(),
      ]);
      const feedbackStats = aggregateFeedbackStats(feedback);
      const { top, lowest } = await fetchTopLowestRatedDishes(5);
      return {
        context: 'Complete System Data',
        data: {
          userStats: users,
          feedbackStats,
          complaintStats: complaints,
          topDishes: top,
          lowestDishes: lowest,
        },
      };
    }

    default: {
      const [userStats, feedback, complaints] = await Promise.all([
        fetchUserStats(),
        fetchAllFeedback(),
        fetchComplaintStats(),
      ]);
      return {
        context: 'General System Overview',
        data: { userStats, feedbackStats: aggregateFeedbackStats(feedback), complaintStats: complaints },
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LOCAL ANALYSIS ENGINE ───────────────────────────────────────────────────
// Generates natural-language answers directly from fetched data. No external
// API calls — instant, always available, zero cost.
// ═══════════════════════════════════════════════════════════════════════════════

function emoji(rating: number): string {
  if (rating >= 4.5) return '🌟';
  if (rating >= 4.0) return '👍';
  if (rating >= 3.0) return '🙂';
  if (rating >= 2.0) return '😐';
  return '😟';
}

function ratingBar(value: number, max: number, width = 10): string {
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function generateLocalAnswer(intent: Intent, data: any, query: string, complaintDetail?: string): string {
  switch (intent) {
    // ── User Stats ──────────────────────────────────────────────────────
    case 'user_count': {
      const u = data;
      const sections: string[] = [
        `**${u.total}** users are registered in the system.`,
        '',
        '| Role | Count |',
        '|------|-------|',
        `| 👨‍🎓 Students | ${u.students} |`,
        `| 🔧 Admins | ${u.admins} |`,
        `| 🧑‍🍳 Canteen Staff | ${u.staff} |`,
        '',
        `**Gender breakdown:** ${u.male} male, ${u.female} female`,
      ];

      if (Object.keys(u.byBlock).length > 0) {
        sections.push(
          '',
          '**By block:** ' +
            Object.entries(u.byBlock)
              .sort((a: any, b: any) => b[1] - a[1])
              .map(([block, count]) => `Block ${block}: ${count}`)
              .join(' | ')
        );
      }
      return sections.join('\n');
    }

    case 'active_users': {
      const u = data;
      const pct = u.total > 0 ? ((u.active / u.total) * 100).toFixed(1) : '0';
      return (
        `**${u.active}** out of **${u.total}** users are currently active (${pct}%).\n` +
        (u.deactivated > 0
          ? `\n🚫 **${u.deactivated}** users are temporarily deactivated.`
          : '\n✅ No users are currently deactivated.')
      );
    }

    // ── Today's Feedback ─────────────────────────────────────────────────
    case 'today_feedback_count': {
      const count = data.feedbackStats.total;
      if (count === 0) return '📭 No feedback submissions received **today**.';
      return `📊 **${count}** feedback ${count === 1 ? 'entry was' : 'entries were'} submitted today.`;
    }

    case 'today_avg_rating': {
      const s = data.feedbackStats;
      const mealFocus = data.mealFocus;

      // Helper: get today's dishes for a specific meal type
      const getMealMenu = (meal: string): string[] => {
        if (!data.todayMenu) return [];
        return data.todayMenu.dishes
          .filter((d: any) => d.mealType.toLowerCase() === meal.toLowerCase())
          .map((d: any) => d.name);
      };

      // When a specific meal is asked about, always show menu first, then rating
      if (mealFocus) {
        const menuItems = getMealMenu(mealFocus);
        const lines: string[] = [];
        if (menuItems.length > 0) {
          lines.push(`🍽️ **Today's ${mealFocus} Menu**`);
          lines.push(...menuItems.map((name: string) => `• ${name}`));
          lines.push('');
        } else {
          lines.push(`🍽️ **Today's ${mealFocus} Menu**`);
          lines.push('Not listed in the weekly menu.');
          lines.push('');
        }
        if (s.byMealType[mealFocus]) {
          const info = s.byMealType[mealFocus];
          lines.push(`**Rating:** ${info.avg} / 5.0 ${emoji(info.avg)} (${info.count} rating${info.count === 1 ? '' : 's'})`);
        } else {
          lines.push(`📭 No ratings recorded for **${mealFocus}** yet today.`);
        }
        return lines.join('\n');
      }

      // No meal focus — show overall daily overview
      if (s.total === 0) return '📭 No ratings recorded today yet.';

      const parts: string[] = [
        `Today's average food rating: **${s.averageRating} / 5.0** ${emoji(s.averageRating)}`,
        '',
        '| Meal Type | Avg Rating | Count |',
        '|-----------|-----------|-------|',
      ];
      for (const [meal, info] of Object.entries(s.byMealType) as [string, { avg: number; count: number }][]) {
        parts.push(`| ${meal} | ${info.avg} | ${info.count} |`);
      }
      if (data.todayMenu) {
        parts.push('', `**Today's menu:** ${data.todayMenu.dishes.map((d: any) => d.name).join(', ')}`);
      }
      return parts.join('\n');
    }

    // ── Weekly Meal Ratings ──────────────────────────────────────────────
    case 'highest_meal_week': {
      const s = data.feedbackStats;
      const meals = Object.entries(s.byMealType) as [string, { avg: number; count: number }][];
      if (meals.length === 0) return '📭 No meal rating data available for this week.';
      meals.sort((a, b) => b[1].avg - a[1].avg);
      const top = meals[0];
      return (
        `🏆 **${top[0]}** has the highest average rating this week: **${top[1].avg} / 5.0** ${emoji(top[1].avg)}` +
        (top[1].count > 0 ? ` (based on ${top[1].count} ratings)` : '') +
        '\n\n**All meal ratings this week:**\n' +
        meals.map(([m, i]) => `${m}: **${i.avg}** (${i.count} ratings)`).join('\n')
      );
    }

    case 'lowest_meal_week': {
      const s = data.feedbackStats;
      const meals = Object.entries(s.byMealType) as [string, { avg: number; count: number }][];
      if (meals.length === 0) return '📭 No meal rating data available for this week.';
      meals.sort((a, b) => a[1].avg - b[1].avg);
      const low = meals[0];
      return (
        `📉 **${low[0]}** has the lowest average rating this week: **${low[1].avg} / 5.0**` +
        (low[1].count > 0 ? ` (based on ${low[1].count} ratings)` : '') +
        '\n\n**All meal ratings this week:**\n' +
        meals.map(([m, i]) => `${m}: **${i.avg}** (${i.count} ratings)`).join('\n')
      );
    }

    // ── Dish Rankings ────────────────────────────────────────────────────
    case 'top_dishes': {
      const top = data.topRated;
      if (!top || top.length === 0) return '📭 No dish rating data available.';
      return (
        `🏆 **Top ${top.length} Highest-Rated Dishes**\n\n` +
        top
          .map(
            (d: any, i: number) =>
              `${i + 1}. **${d.name}** — **${d.avg} / 5.0** ${emoji(d.avg)} (${d.count} rating${d.count === 1 ? '' : 's'})`
          )
          .join('\n')
      );
    }

    case 'lowest_dishes': {
      const low = data.lowestRated;
      if (!low || low.length === 0) return '📭 No dish rating data available.';
      return (
        `📉 **${low.length} Lowest-Rated Dishes**\n\n` +
        low
          .map(
            (d: any, i: number) =>
              `${i + 1}. **${d.name}** — **${d.avg} / 5.0** (${d.count} rating${d.count === 1 ? '' : 's'})`
          )
          .join('\n')
      );
    }

    case 'dishes_to_improve': {
      const low = data.lowestRated;
      if (!low || low.length === 0) return '📭 Not enough data to determine which dishes need improvement.';
      const needsWork = low.filter((d: any) => d.avg < 3.0);
      if (needsWork.length === 0) {
        return '✅ All dishes are rated above **3.0 / 5.0** — no immediate action needed.\n\nFor reference, the lowest-rated dishes are:\n' +
          low.map((d: any) => `• **${d.name}** — **${d.avg} / 5.0** (${d.count} ratings)`).join('\n');
      }
      return (
        `⚠️ **${needsWork.length} dish${needsWork.length === 1 ? '' : 'es'} need attention** (below 3.0 / 5.0):\n\n` +
        needsWork
          .map(
            (d: any) =>
              `• **${d.name}** — **${d.avg} / 5.0** ${emoji(d.avg)} (${d.count} ratings)`
          )
          .join('\n') +
        '\n\n💡 **Suggestions:** Consider reviewing recipes, ingredient quality, or portion sizes for these dishes.'
      );
    }

    case 'most_liked': {
      const top = data.topRated;
      const mealLabel = data.mealFocus ? ` for ${data.mealFocus}` : '';
      if (!top || top.length === 0) return `📭 No dish popularity data available${mealLabel}.`;
      return (
        `❤️ **Most Liked Menu Items${mealLabel}**\n\n` +
        top
          .slice(0, 5)
          .map(
            (d: any, i: number) =>
              `${i + 1}. **${d.name}** — **${d.avg} / 5.0** ${emoji(d.avg)} (${d.count} ratings)`
          )
          .join('\n') +
        '\n\n💡 These dishes are well-received — consider featuring them more frequently!'
      );
    }

    // ── Block Analysis ───────────────────────────────────────────────────
    case 'block_feedback': {
      const blocks = Object.entries(data) as [string, { count: number; avgRating: number }][];
      if (blocks.length === 0) return '📭 No block-wise data available.';
      blocks.sort((a, b) => b[1].count - a[1].count);
      return (
        '**Feedback by Hostel Block**\n\n' +
        blocks
          .map(
            ([block, info]) =>
              `• **Block ${block}**: ${info.count} submissions, avg rating **${info.avgRating} / 5.0** ${emoji(info.avgRating)}`
          )
          .join('\n')
      );
    }

    // ── Complaints ───────────────────────────────────────────────────────
    case 'most_complaints_day': {
      const c = data;
      if (!c.mostComplainedDay) return '📭 No complaint data available.';
      return `📅 **${c.mostComplainedDay}** has the highest number of complaints (${c.byDate[c.mostComplainedDay]} complaints recorded).`;
    }

    case 'common_complaints': {
      const c = data;
      const allComplaints = c.allComplaints || [];

      // If a specific complaint type is mentioned, show individual complaints
      if (complaintDetail && allComplaints.length > 0) {
        // Normalize the search term: extract the part before the colon
        const searchTerm = complaintDetail.replace(/:.*/, '').trim().toLowerCase();
        const matching = allComplaints.filter(
          (comp: any) => comp.type && comp.type.toLowerCase().includes(searchTerm)
        );
        if (matching.length === 0) {
          return `📭 No complaints found matching **"${complaintDetail}"**.`;
        }
        const statusEmoji: Record<string, string> = { 'Pending': '⏳', 'In Progress': '🔄', 'Resolved': '✅' };
        return (
          `📋 **${matching.length} complaint${matching.length === 1 ? '' : 's'} matching** "${complaintDetail.replace(/:.*/, '').trim()}"\n\n` +
          matching
            .slice(0, 15)
            .map(
              (comp: any, i: number) =>
                `${i + 1}. **${comp.type}**\n` +
                `   👤 ${comp.userName} | 🚪 ${comp.room || 'N/A'} | 📅 ${comp.dateString || 'N/A'}\n` +
                `   💬 "${comp.desc || comp.type}"\n` +
                `   ${statusEmoji[comp.status] || '📌'} **${comp.status}**`
            )
            .join('\n\n') +
          (matching.length > 15 ? `\n\n...and ${matching.length - 15} more` : '')
        );
      }

      // If user asked for "all" or "list" of complaints, show individual entries
      const isAllQuery = /all|list|fetch/i.test(query) && !/common|most/i.test(query);
      if (isAllQuery && allComplaints.length > 0) {
        const statusEmoji: Record<string, string> = { 'Pending': '⏳', 'In Progress': '🔄', 'Resolved': '✅' };
        return (
          `📋 **All ${allComplaints.length} Complaints**\n\n` +
          allComplaints
            .slice(0, 20)
            .map(
              (comp: any, i: number) =>
                `${i + 1}. **${comp.type}**\n` +
                `   👤 ${comp.userName} | 🚪 ${comp.room || 'N/A'} | 📅 ${comp.dateString || 'N/A'}\n` +
                `   💬 "${comp.desc || comp.type}"\n` +
                `   ${statusEmoji[comp.status] || '📌'} **${comp.status}**`
            )
            .join('\n\n') +
          (allComplaints.length > 20 ? `\n\n...and ${allComplaints.length - 20} more` : '') +
          `\n\n📊 **${c.pending} pending**, ${c.inProgress} in progress, **${c.resolved} resolved**`
        );
      }

      if (c.commonComplaints.length === 0) return '📭 No complaint data available.';
      const isAnalytics = /analytics|by category|group|breakdown|distribution|graph|chart|dashboard|report|kpi|power.?bi/i.test(query);

      if (isAnalytics) {
        const total = c.total || 0;
        return (
          `📊 **Complaint Analytics** — ${total} total (${c.pending || 0} pending, ${c.inProgress || 0} in progress, ${c.resolved || 0} resolved)`
        );
      }

      return (
        '**Most Common Complaints**\n\n' +
        c.commonComplaints.map((type: string, i: number) =>
          `${i + 1}. **${type}** — ${c.byType[type] || 0} report${(c.byType[type] || 0) === 1 ? '' : 's'}`
        ).join('\n') +
        `\n\n📊 **Overall:** ${c.total} total complaints (${c.pending} pending, ${c.inProgress} in progress, ${c.resolved} resolved)`
      );
    }

    // ── Summary Reports ──────────────────────────────────────────────────
    case 'today_summary': {
      const s = data.feedbackStats;
      if (s.total === 0) {
        return `📭 **Today's Summary**\n\nNo feedback received today.`;
      }
      const d = data.todayMenu;
      return (
        `📋 **Today's Summary**\n\n` +
        `**Feedback:** ${s.total} submission${s.total === 1 ? '' : 's'} • Avg rating **${s.averageRating} / 5.0** ${emoji(s.averageRating)}\n` +
        `**Complaints:** ${data.totalComplaintsToday} today\n` +
        (d ? `**Menu:** ${d.dishes.map((x: any) => x.name).join(', ')}\n` : '') +
        '\n**Rating Distribution:**\n' +
        [5, 4, 3, 2, 1]
          .map((r) => {
            const count = s.ratingDistribution[r] || 0;
            return `  ${r}★: ${count}`;
          })
          .join('\n')
      );
    }

    case 'week_insights':
    case 'weekly_report': {
      const s = data.feedbackStats;
      if (s.total === 0) return `📭 **This Week's Insights**\n\nNo feedback data for this week yet.`;
      return (
        `📊 **Weekly Analytics Report**\n\n` +
        `**Total Feedback:** ${s.total}\n` +
        `**Average Rating:** ${s.averageRating} / 5.0 ${emoji(s.averageRating)}\n\n` +
        '**By Meal Type:**\n' +
        Object.entries(s.byMealType)
          .sort((a: any, b: any) => b[1].avg - a[1].avg)
          .map(([meal, info]: [string, any]) => `${meal}: **${info.avg}** (${info.count} ratings)`)
          .join('\n') +
        '\n\n**Rating Distribution:**\n' +
        [5, 4, 3, 2, 1]
          .map((r) => `  ${r}★: ${s.ratingDistribution[r] || 0}`)
          .join('\n')
      );
    }

    case 'monthly_report': {
      const r = data;
      const fb = r.feedbackStats;
      const cu = r.complaintStats;
      return (
        `📊 **Monthly Report — ${r.month}**\n\n` +
        `**Users**\n` +
        `• Total: ${r.userStats.total} (${r.userStats.active} active)\n` +
        `• ${r.userStats.students} students, ${r.userStats.admins} admins, ${r.userStats.staff} staff\n\n` +
        `**Feedback**\n` +
        `• ${fb.total} submissions this month\n` +
        `• Average rating: **${fb.averageRating} / 5.0** ${emoji(fb.averageRating)}\n\n` +
        `**Top Dishes**\n` +
        r.topDishes.map((d: any, i: number) => `${i + 1}. ${d.name} — ${d.avg}`).join('\n') +
        '\n\n**Needs Improvement**\n' +
        r.lowestDishes.map((d: any, i: number) => `${i + 1}. ${d.name} — ${d.avg}`).join('\n') +
        `\n\n**Complaints**\n` +
        `• ${cu.total} total (${cu.pending} pending, ${cu.resolved} resolved)\n` +
        `• Most common: ${cu.commonComplaints.slice(0, 3).join(', ') || 'N/A'}\n\n` +
        `**Suggestions:** ${r.suggestionCount} submitted`
      );
    }

    case 'week_comparison': {
      const tw = data.thisWeekStats;
      const lw = data.lastWeekStats;
      if (tw.total === 0 && lw.total === 0) return '📭 No data available for either week.';
      const diff = (tw.averageRating - lw.averageRating).toFixed(2);
      const trend =
        Number(diff) > 0
          ? `📈 **Up ${diff} points** from last week`
          : Number(diff) < 0
          ? `📉 **Down ${Math.abs(Number(diff))} points** from last week`
          : '➡️ **No change** from last week';
      return (
        '**Week-over-Week Comparison**\n\n' +
        `| Metric | This Week | Last Week |\n|--------|-----------|-----------|\n` +
        `| Total Feedback | ${tw.total} | ${lw.total} |\n` +
        `| Average Rating | **${tw.averageRating} / 5.0** ${emoji(tw.averageRating)} | **${lw.averageRating} / 5.0** ${emoji(lw.averageRating)} |\n\n` +
        `**Trend:** ${trend}`
      );
    }

    case 'unusual_trends': {
      const s = data.feedbackStats;
      const c = data.complaintStats;
      const lines: string[] = ['🔍 **Trend Analysis**\n'];

      // Check rating extremes
      const highCount = s.ratingDistribution[5] || 0;
      const lowCount = s.ratingDistribution[1] || 0;
      const total = s.total || 1;
      if ((highCount / total) > 0.5) {
        lines.push('✅ **Positive trend:** More than 50% of ratings are 5★ — students are very satisfied.');
      }
      if ((lowCount / total) > 0.2) {
        lines.push('⚠️ **Concerning trend:** Over 20% of ratings are 1★ — investigate food quality issues.');
      }

      // Check complaint resolution
      if (c.total > 0) {
        const resolveRate = ((c.resolved / c.total) * 100).toFixed(0);
        if (Number(resolveRate) < 30) {
          lines.push(`🔄 **Backlog:** Only ${resolveRate}% of complaints are resolved (${c.pending} still pending).`);
        } else if (Number(resolveRate) > 80) {
          lines.push(`✅ **Good responsiveness:** ${resolveRate}% of complaints have been resolved.`);
        }
      }

      if (lines.length === 1) {
        lines.push('📊 No significant unusual trends detected. Everything appears within normal ranges.');
      }

      lines.push(
        '',
        `📊 **Quick Stats:**`,
        `• Rating spread: 1★=${s.ratingDistribution[1] || 0}, 5★=${s.ratingDistribution[5] || 0}`,
        `• Total complaints: ${c.total}`,
        `• Suggestions received: ${data.suggestionCount || 0}`
      );

      return lines.join('\n');
    }

    // ── Day-specific Menu ─────────────────────────────────────────────────
    case 'day_menu': {
      const dayName = data.dayFocus || 'That day';
      const mealName = data.mealFocus;
      const menuData = data.menu;

      if (dayName === '__all__') {
        if (!menuData || !Array.isArray(menuData) || menuData.length === 0) {
          return '📭 No weekly menu data available.';
        }
        if (mealName) {
          const mealKey = mealName.toLowerCase();
          const cappedKey = mealName.charAt(0).toUpperCase() + mealName.slice(1).toLowerCase();
          let cnt = 0;
          for (const day of menuData) {
            cnt += ((day as any)[mealKey] || (day)[cappedKey] || []).length;
          }
          return '📋 **' + mealName + ' Menu** — ' + cnt + ' items across ' + menuData.length + ' days.';
        }
        const cnt = menuData.reduce((acc, d) => {
          const keys = ['breakfast', 'lunch', 'snacks', 'dinner', 'Breakfast', 'Lunch', 'Snacks', 'Dinner'];
          return acc + keys.reduce((sum, k) => sum + ((d)[k]?.length || 0), 0);
        }, 0);
        return '📋 **Weekly Menu** — ' + cnt + ' items across ' + menuData.length + ' days.';
      }

      if (!menuData || !menuData.dishes || !menuData.dishes.length) {
        const note = mealName
          ? 'No menu data available for **' + mealName + '** on **' + dayName + '**.'
          : 'No menu data available for **' + dayName + '**.';
        return '📭 ' + note;
      }

      const total = menuData.dishes.length;
      if (mealName) {
        const mealItems = menuData.dishes.filter((d) => d.mealType.toLowerCase() === mealName.toLowerCase());
        if (mealItems.length === 0) {
          return '📭 **' + mealName + '** is not listed in the menu for **' + dayName + '**.';
        }
        return '🍽️ **' + dayName + ' ' + mealName + ' Menu** — ' + mealItems.length + ' items';
      }
      return '📋 **' + dayName + ' Menu** — ' + total + ' items';
    }

    case 'canteen_items': {
      const items = data.items || [];
      const searchName = data.searchName;
      if (searchName) {
        if (items.length === 0) return '❌ **' + searchName.charAt(0).toUpperCase() + searchName.slice(1) + '** is not available in the canteen.';
        const item = items[0];
        const avail = item.isAvailable !== false;
        return (avail ? '✅' : '❌') + ' **' + item.name.charAt(0).toUpperCase() + item.name.slice(1) + '** ' + (avail ? 'is available' : 'is currently unavailable') + ' in the canteen' + (item.price ? ' at ₹' + item.price : '') + '.';
      }
      if (items.length === 0) return '📭 No canteen items found.';
      return '🍽️ **Canteen** — ' + items.length + ' items available';
    }

    // ── General / Fallback ───────────────────────────────────────────────
    case 'general_analysis': {
      const u = data.userStats;
      const s = data.feedbackStats;
      const c = data.complaintStats;
      const top = data.topDishes || [];
      const low = data.lowestDishes || [];
      return (
        `📊 **System Overview**\n\n` +
        `**Users:** ${u.total} registered (${u.active} active)\n` +
        `**Feedback:** ${s.total} total • Avg **${s.averageRating} / 5.0** ${emoji(s.averageRating)}\n` +
        `**Complaints:** ${c.total} (${c.pending} pending)\n` +
        (top.length > 0 ? `\n🏆 **Top Dishes:** ${top.map((d: any) => d.name).join(', ')}\n` : '') +
        (low.length > 0 ? `📉 **Needs Work:** ${low.slice(0, 3).map((d: any) => d.name).join(', ')}\n` : '') +
        '\n💡 *Ask more specific questions for deeper insights!*'
      );
    }

    // ── User Search ──────────────────────────────────────────────────────
    case 'user_search': {
      const { query: searchTerm, matches, total } = data;
      if (!matches || matches.length === 0) {
        return `🔍 No users found matching **"${searchTerm}"** among ${total} registered users.`;
      }
      if (matches.length === 1) {
        const u = matches[0];
        return (
          `✅ **User found!**\n\n` +
          `**Name:** ${u.displayName}\n` +
          `**Email:** ${u.email}\n` +
          `**Role:** ${u.role}\n` +
          (u.gender ? `**Gender:** ${u.gender}\n` : '') +
          (u.roomNumber && u.roomNumber !== 'N/A' ? `**Room:** ${u.roomNumber}\n` : '') +
          (u.deactivatedUntil && new Date() < new Date(u.deactivatedUntil)
            ? `\n🚫 **Account deactivated until** ${new Date(u.deactivatedUntil).toLocaleDateString()}`
            : '\n✅ **Account active**')
        );
      }
      // Multiple matches
      return (
        `🔍 **${matches.length} users found** matching "${searchTerm}" among ${total} registered users:\n\n` +
        matches
          .slice(0, 10)
          .map(
            (u: any, i: number) =>
              `${i + 1}. **${u.displayName}** — ${u.email} (${u.role})${u.deactivatedUntil && new Date() < new Date(u.deactivatedUntil) ? ' 🚫' : ''}`
          )
          .join('\n') +
        (matches.length > 10 ? `\n...and ${matches.length - 10} more` : '')
      );
    }

    // ── Dish / Menu Item Search ─────────────────────────────────────────
    case 'dish_search': {
      const { query: dishName, menuHits, feedbackHits, hitCount, dayCount, fbCount } = data;
      const mealLabels: Record<string, string> = {
        breakfast: '☀️ Breakfast',
        lunch: '🌤️ Lunch',
        snacks: '🍪 Snacks',
        dinner: '🌙 Dinner',
      };
      const lines: string[] = [];
      const hasMenu = menuHits && hitCount > 0;
      const hasFeedback = feedbackHits && fbCount > 0;

      if (!hasMenu && !hasFeedback) {
        return `🔍 **"${dishName}"** was not found in this week's menu or feedback data.`;
      }

      // Show menu schedule if found
      if (hasMenu) {
        lines.push(`🍽️ **"${dishName}"** is on the menu **${hitCount} time${hitCount === 1 ? '' : 's'}** across **${dayCount} day${dayCount === 1 ? '' : 's'}** this week.\n`);
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const grouped = new Map<string, typeof menuHits>();
        for (const hit of menuHits) {
          if (!grouped.has(hit.day)) grouped.set(hit.day, []);
          grouped.get(hit.day)!.push(hit);
        }
        const sortedDays = [...grouped.entries()].sort((a, b) => dayOrder.indexOf(a[0]) - dayOrder.indexOf(b[0]));
        for (const [day, dayHits] of sortedDays) {
          lines.push(`**${day}**`);
          for (const h of dayHits) {
            const label = mealLabels[h.mealType] || h.mealType;
            lines.push(`  ${label}: ${h.dishName} ${h.isVeg ? '🟢' : '🔴'}`);
          }
          lines.push('');
        }
      }

      // Show feedback dates if found (chart handles visual representation)
      if (hasFeedback) {
        if (!hasMenu) lines.push('');
        lines.push(`📊 See the rating trend chart below for the feedback dates.`);
      }

      return lines.join('\n').trimEnd();
    }

    default: {
      const u = data.userStats;
      const s = data.feedbackStats;
      return (
        `📊 **Available Data Summary**\n\n` +
        `**Users:** ${u?.total || 0} registered\n` +
        `**Feedback:** ${s?.total || 0} entries, avg **${s?.averageRating || 'N/A'} / 5.0**\n` +
        `**Complaints:** ${data.complaintStats?.total || 0}\n\n` +
        `_I wasn't sure what you were asking. Try rephrasing or use one of the quick questions above._`
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CHART DATA GENERATOR ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_ORANGE = '#f97316';
const CHART_BLUE = '#3b82f6';
const CHART_EMERALD = '#10b981';
const CHART_VIOLET = '#8b5cf6';
const CHART_AMBER = '#f59e0b';
const CHART_RED = '#ef4444';
const CHART_PINK = '#ec4899';
const CHART_TEAL = '#14b8a6';
const CHART_INDIGO = '#6366f1';

const CHART_COLORS = [
  CHART_ORANGE,
  CHART_BLUE,
  CHART_EMERALD,
  CHART_VIOLET,
  CHART_AMBER,
  CHART_PINK,
  CHART_TEAL,
  CHART_INDIGO,
  CHART_RED,
];

const RATING_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981'];

function generateChartData(intent: Intent, data: any, _query: string): ChartConfig[] {
  const charts: ChartConfig[] = [];

  switch (intent) {
    // ── User Stats ──────────────────────────────────────────────────────
    case 'user_count': {
      const u = data;
      // Role distribution pie
      charts.push({
        kind: 'pie',
        title: 'User Role Distribution',
        data: [
          { label: 'Students', value: u.students || 0, color: CHART_ORANGE },
          { label: 'Admins', value: u.admins || 0, color: CHART_BLUE },
          { label: 'Staff', value: u.staff || 0, color: CHART_EMERALD },
        ].filter(p => p.value > 0),
      });
      // By block bar
      const blocks = Object.entries(u.byBlock || {}) as [string, number][];
      if (blocks.length > 0) {
        blocks.sort((a, b) => b[1] - a[1]);
        charts.push({
          kind: 'bar',
          title: 'Users by Block',
          data: blocks.slice(0, 10).map(([block, count], i) => ({
            label: `Block ${block}`,
            value: count,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
      }
      break;
    }

    // ── Today's Ratings ────────────────────────────────────────────────
    case 'today_avg_rating': {
      const s = data.feedbackStats;
      const mealFocus = data.mealFocus;
      if (!s) break;

      if (mealFocus) {
        // ── Specific meal → show per-dish breakdown ──
        const todayMenu = data.todayMenu;
        if (todayMenu?.dishes?.length) {
          const mealDishes = todayMenu.dishes.filter(
            (d: any) => d.mealType.toLowerCase() === mealFocus.toLowerCase()
          );
          if (mealDishes.length > 0) {
            const dishRatings = mealDishes
              .map((dish: any, i: number) => {
                const stats = (s.byDish || {})[dish.name];
                return {
                  label: dish.name,
                  value: stats ? stats.avg : 0,
                  count: stats ? stats.count : 0,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                };
              })
              .filter((d) => d.count > 0);
            if (dishRatings.length > 0) {
              charts.push({
                kind: 'horizontalBar',
                title: `${mealFocus} — Per Dish Rating`,
                data: dishRatings,
              });
            }
          }
        }
      } else {
        // ── General → show meal type overview ──
        const meals = Object.entries(s.byMealType || {}) as [string, { avg: number; count: number }][];
        if (meals.length > 0) {
          charts.push({
            kind: 'bar',
            title: 'Average Rating by Meal Type',
            data: meals.map(([meal, info], i) => ({
              label: meal,
              value: info.avg,
              color: CHART_COLORS[i % CHART_COLORS.length],
            })),
          });
        }
      }

      // Rating distribution bar (always)
      const dist = s.ratingDistribution;
      if (dist) {
        const distData: ChartDataPoint[] = [];
        for (let r = 5; r >= 1; r--) {
          if ((dist[r] || 0) > 0) {
            distData.push({
              label: `${r} ★`,
              value: dist[r],
              color: RATING_COLORS[r - 1],
            });
          }
        }
        if (distData.length > 0) {
          charts.push({
            kind: 'horizontalBar',
            title: 'Rating Distribution',
            data: distData,
          });
        }
      }
      break;
    }

    // ── Meal Type Rankings ─────────────────────────────────────────────
    case 'highest_meal_week':
    case 'lowest_meal_week': {
      const s = data.feedbackStats;
      if (!s) break;
      const meals = Object.entries(s.byMealType || {}) as [string, { avg: number; count: number }][];
      if (meals.length > 0) {
        const sorted = [...meals].sort((a, b) =>
          intent === 'highest_meal_week' ? b[1].avg - a[1].avg : a[1].avg - b[1].avg
        );
        charts.push({
          kind: 'bar',
          title: intent === 'highest_meal_week' ? 'Highest Rated Meals' : 'Lowest Rated Meals',
          data: sorted.map(([meal, info], i) => ({
            label: meal,
            value: info.avg,
            color: intent === 'highest_meal_week' ? CHART_COLORS[i % CHART_COLORS.length] : CHART_RED,
          })),
        });
      }
      break;
    }

    // ── Dish Rankings ──────────────────────────────────────────────────
    case 'top_dishes':
    case 'most_liked': {
      const top = data.topRated;
      const mealLabel = data.mealFocus ? ` (${data.mealFocus})` : '';
      if (top && top.length > 0) {
        charts.push({
          kind: 'horizontalBar',
          title: `Top Rated Dishes${mealLabel}`,
          data: top.slice(0, 8).map((d: any, i: number) => ({
            label: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name,
            value: d.avg,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
      }
      break;
    }

    case 'lowest_dishes':
    case 'dishes_to_improve': {
      const low = data.lowestRated;
      if (low && low.length > 0) {
        charts.push({
          kind: 'horizontalBar',
          title: intent === 'dishes_to_improve' ? 'Dishes Needing Improvement' : 'Lowest Rated Dishes',
          data: low.slice(0, 8).map((d: any, i: number) => ({
            label: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name,
            value: d.avg,
            color: CHART_RED,
          })),
        });
      }
      break;
    }

    // ── Block Feedback ─────────────────────────────────────────────────
    case 'block_feedback': {
      const blocks = Object.entries(data) as [string, { count: number; avgRating: number }][];
      if (blocks.length > 0) {
        blocks.sort((a, b) => b[1].count - a[1].count);
        charts.push({
          kind: 'bar',
          title: 'Feedback Count by Block',
          data: blocks.slice(0, 10).map(([block, info], i) => ({
            label: `Block ${block}`,
            value: info.count,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
        charts.push({
          kind: 'horizontalBar',
          title: 'Average Rating by Block',
          data: blocks.slice(0, 10).map(([block, info], i) => ({
            label: `Block ${block}`,
            value: info.avgRating,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
      }
      break;
    }

    // ── Complaints ─────────────────────────────────────────────────────
    case 'common_complaints':
    case 'most_complaints_day': {
      const c = data;
      // Complaint categories bar
      const types = Object.entries(c.byType || {}) as [string, number][];
      if (types.length > 0) {
        types.sort((a, b) => b[1] - a[1]);
        charts.push({
          kind: 'bar',
          title: 'Complaints by Category',
          data: types.slice(0, 8).map(([type, count], i) => ({
            label: type.length > 15 ? type.slice(0, 13) + '…' : type,
            value: count,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
      }
      // Status distribution pie
      if (c.total && c.total > 0) {
        charts.push({
          kind: 'pie',
          title: 'Complaint Status',
          data: [
            { label: 'Pending', value: c.pending || 0, color: CHART_RED },
            { label: 'In Progress', value: c.inProgress || 0, color: CHART_AMBER },
            { label: 'Resolved', value: c.resolved || 0, color: CHART_EMERALD },
          ].filter(p => p.value > 0),
        });
      }
      // Complaints by date — use createdAt timestamps for reliable parsing
      const allComplaints: any[] = c.allComplaints || [];
      if (allComplaints.length > 1) {
        const byDateGrp = new Map<string, number>();
        for (const comp of allComplaints) {
          if (comp.createdAt) {
            const d = new Date(comp.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            byDateGrp.set(key, (byDateGrp.get(key) || 0) + 1);
          }
        }
        const entries = [...byDateGrp.entries()].sort(([a], [b]) => a.localeCompare(b));
        if (entries.length > 1) {
          charts.push({
            kind: 'bar',
            title: 'Complaints by Date',
            data: entries.slice(-14).map(([dateKey, count]) => {
              const d = new Date(dateKey + 'T00:00:00');
              const day = d.getDate();
              const month = d.toLocaleString('en-US', { month: 'short' });
              const year = d.getFullYear();
              return { label: `${day}|${month}|${year}`, value: count, color: CHART_TEAL };
            }),
          });
        }
      }
      break;
    }

    // ── Summary / Reports ──────────────────────────────────────────────
    case 'today_summary': {
      const s = data.feedbackStats;
      if (!s) break;
      const dist = s.ratingDistribution;
      if (dist) {
        const distData: ChartDataPoint[] = [];
        for (let r = 5; r >= 1; r--) {
          if ((dist[r] || 0) > 0) {
            distData.push({
              label: `${r} ★`,
              value: dist[r],
              color: RATING_COLORS[r - 1],
            });
          }
        }
        if (distData.length > 0) {
          charts.push({
            kind: 'horizontalBar',
            title: 'Today\'s Rating Distribution',
            data: distData,
          });
        }
      }
      // Meal type breakdown
      const meals = Object.entries(s.byMealType || {}) as [string, { avg: number; count: number }][];
      if (meals.length > 0) {
        charts.push({
          kind: 'bar',
          title: 'Average Rating by Meal Type',
          data: meals.map(([meal, info], i) => ({
            label: meal,
            value: info.avg,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
      }
      break;
    }

    case 'week_insights':
    case 'weekly_report': {
      const s = data.feedbackStats;
      if (!s) break;
      // Rating distribution
      const dist = s.ratingDistribution;
      if (dist) {
        const distData: ChartDataPoint[] = [];
        for (let r = 5; r >= 1; r--) {
          if ((dist[r] || 0) > 0) {
            distData.push({
              label: `${r} ★`,
              value: dist[r],
              color: RATING_COLORS[r - 1],
            });
          }
        }
        if (distData.length > 0) {
          charts.push({
            kind: 'horizontalBar',
            title: 'This Week\'s Rating Distribution',
            data: distData,
          });
        }
      }
      // By meal type
      const meals = Object.entries(s.byMealType || {}) as [string, { avg: number; count: number }][];
      if (meals.length > 0) {
        charts.push({
          kind: 'bar',
          title: 'Average Rating by Meal Type',
          data: meals.map(([meal, info], i) => ({
            label: meal,
            value: info.avg,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
      }
      break;
    }

    // ── Monthly Report ─────────────────────────────────────────────────
    case 'monthly_report': {
      const r = data;
      // Top dishes
      if (r.topDishes && r.topDishes.length > 0) {
        charts.push({
          kind: 'horizontalBar',
          title: 'Top Dishes This Month',
          data: r.topDishes.slice(0, 5).map((d: any, i: number) => ({
            label: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name,
            value: d.avg,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
      }
      // Lowest dishes
      if (r.lowestDishes && r.lowestDishes.length > 0) {
        charts.push({
          kind: 'horizontalBar',
          title: 'Dishes Needing Improvement',
          data: r.lowestDishes.slice(0, 5).map((d: any, i: number) => ({
            label: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name,
            value: d.avg,
            color: CHART_RED,
          })),
        });
      }
      // Complaint status
      const cs = r.complaintStats;
      if (cs && cs.total > 0) {
        charts.push({
          kind: 'pie',
          title: 'Complaint Status',
          data: [
            { label: 'Pending', value: cs.pending || 0, color: CHART_RED },
            { label: 'In Progress', value: cs.inProgress || 0, color: CHART_AMBER },
            { label: 'Resolved', value: cs.resolved || 0, color: CHART_EMERALD },
          ].filter(p => p.value > 0),
        });
      }
      break;
    }

    // ── Week Comparison ────────────────────────────────────────────────
    case 'week_comparison': {
      const tw = data.thisWeekStats;
      const lw = data.lastWeekStats;
      if (tw && lw) {
        // Meal type comparison bar with secondary data
        const twMeals = tw.byMealType as Record<string, { avg: number; count: number }> | undefined;
        const lwMeals = lw.byMealType as Record<string, { avg: number; count: number }> | undefined;
        if (twMeals && lwMeals) {
          const allMealTypes = new Set([...Object.keys(twMeals), ...Object.keys(lwMeals)]);
          const mealData = [...allMealTypes].map(meal => ({
            label: meal,
            value: twMeals[meal]?.avg || 0,
          }));
          const lastWeekData = [...allMealTypes].map(meal => ({
            label: meal,
            value: lwMeals[meal]?.avg || 0,
          }));
          if (mealData.length > 0) {
            charts.push({
              kind: 'bar',
              title: 'This Week vs Last Week (Avg Rating)',
              data: mealData,
              secondaryData: lastWeekData,
            });
          }
        }
        // Rating count comparison
        const countData: ChartDataPoint[] = [
          { label: 'This Week', value: tw.total || 0, color: CHART_ORANGE },
          { label: 'Last Week', value: lw.total || 0, color: CHART_BLUE },
        ];
        charts.push({
          kind: 'bar',
          title: 'Total Feedback Count',
          data: countData,
        });
      }
      break;
    }

    // ── Suggestions Count ──
    case 'suggestions_count':
    case 'suggestion_dishes': {
      const dishResults = (intent === 'suggestion_dishes' ? data.dishResults : null) || [];
      if (dishResults.length > 0) {
        const sorted = [...dishResults].sort((a, b) => (b.positive || 0) - (a.positive || 0));
        charts.push({
          kind: 'horizontalBar',
          title: 'Dishes Mentioned in Suggestions',
          data: sorted.slice(0, 8).map((d, i) => ({
            label: d.name.charAt(0).toUpperCase() + d.name.slice(1),
            value: d.count,
            color: (d.positive || 0) > (d.negative || 0) ? CHART_EMERALD : (d.negative || 0) > 0 ? '#ef4444' : CHART_COLORS[i % CHART_COLORS.length],
          })),
        });      }
      break;
    }

    // ── Feedback Count ──
    case 'feedback_count': {
      const fb = data.feedbacks || [];
      if (fb.length > 0) {
        const byDate = new Map();
        fb.forEach((f) => {
          const key = f.date || 'unknown';
          byDate.set(key, (byDate.get(key) || 0) + 1);
        });
        const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
        let chartData;
        if (sorted.length > 14) {
          const recent = sorted.slice(-14);
          chartData = recent.map(([date, count], i) => {
            const d = new Date(date + 'T00:00:00');
            const label = isNaN(d.getTime())
              ? date
              : d.getDate() + ' ' + d.toLocaleString('en-US', { month: 'short' });
            return { label, value: count, color: CHART_COLORS[i % CHART_COLORS.length] };
          });
        } else {
          chartData = sorted.map(([date, count], i) => {
            const d = new Date(date + 'T00:00:00');
            const label = isNaN(d.getTime())
              ? date
              : d.getDate() + ' ' + d.toLocaleString('en-US', { month: 'short' });
            return { label, value: count, color: CHART_COLORS[i % CHART_COLORS.length] };
          });
        }
        charts.push({
          kind: 'bar',
          title: 'Feedback per Day',
          data: chartData,
        });
        // Data table with individual entries
        const rows = fb.slice(0, 50).map((f: any) => {
          const d = f.date ? new Date(f.date + 'T00:00:00') : null;
          const dateStr = d && !isNaN(d.getTime())
            ? d.getDate() + ' ' + d.toLocaleString('en-US', { month: 'short' })
            : f.date || '—';
          const stars = f.rating ? '★'.repeat(f.rating) : '—';
          return {
            date: dateStr,
            user: f.userName || 'Anonymous',
            dish: f.dishName || '—',
            rating: stars,
          };
        });
        if (rows.length > 0) {
          charts.push({
            kind: 'table',
            title: 'Feedback Details',
            columns: [
              { key: 'date', label: 'Date' },
              { key: 'user', label: 'User' },
              { key: 'dish', label: 'Dish' },
              { key: 'rating', label: 'Rating' },
            ],
            rows,
          });
        }
      }
      break;
    }

    // ── General Analysis ───────────────────────────────────────────────
    case 'general_analysis': {
      // Rating distribution
      const s = data.feedbackStats;
      if (s && s.ratingDistribution) {
        const distData: ChartDataPoint[] = [];
        for (let r = 5; r >= 1; r--) {
          if ((s.ratingDistribution[r] || 0) > 0) {
            distData.push({
              label: `${r} ★`,
              value: s.ratingDistribution[r],
              color: RATING_COLORS[r - 1],
            });
          }
        }
        if (distData.length > 0) {
          charts.push({
            kind: 'horizontalBar',
            title: 'Rating Distribution',
            data: distData,
          });
        }
      }
      // User role distribution
      const u = data.userStats;
      if (u) {
        const roleData = [
          { label: 'Students', value: u.students || 0, color: CHART_ORANGE },
          { label: 'Admins', value: u.admins || 0, color: CHART_BLUE },
          { label: 'Staff', value: u.staff || 0, color: CHART_EMERALD },
        ].filter(p => p.value > 0);
        if (roleData.length > 0) {
          charts.push({
            kind: 'pie',
            title: 'User Roles',
            data: roleData,
          });
        }
      }
      // Top dishes
      if (data.topDishes && data.topDishes.length > 0) {
        charts.push({
          kind: 'horizontalBar',
          title: 'Top Dishes',
          data: data.topDishes.slice(0, 5).map((d: any, i: number) => ({
            label: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name,
            value: d.avg,
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        });
      }
      break;
    }

          // ── Dish Search ──
    case 'dish_search': {
      const fbHits = data.feedbackHits || [];
      if (fbHits.length > 0) {
        const byDate = new Map();
        fbHits.forEach((h) => {
          const key = h.date || 'unknown';
          if (!byDate.has(key)) byDate.set(key, { sum: 0, count: 0 });
          const e = byDate.get(key);
          e.sum += h.rating;
          e.count++;
        });
        const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
        charts.push({
          kind: 'bar',
          title: 'Rating Trend - ' + (data.query || ''),
          data: sorted.map(([date, info]) => {
            const d = new Date(date + 'T00:00:00');
            const label = isNaN(d.getTime())
              ? date
              : d.getDate() + ' ' + d.toLocaleString('en-US', { month: 'short' });
            return { label, value: info.count > 0 ? info.sum / info.count : 0, color: CHART_ORANGE };
          }),
        });
      }
      break;
    }

    // ── Day Menu (weekly overview) ──
    case 'canteen_items': {
      const items = data.items || [];
      if (items.length > 0) {
        const rows = items.map(i => ({
          item: i.name || '—',
          price: i.price ? '₹' + i.price : '—',
          category: i.category || '—',
          status: i.isAvailable !== false ? '✅' : '❌',
        }));
        charts.push({
          kind: 'table',
          title: 'Canteen Items',
          columns: [
            { key: 'item', label: 'Item' },
            { key: 'price', label: 'Price' },
            { key: 'category', label: 'Category' },
            { key: 'status', label: 'Avail' },
          ],
          rows,
        });
      }
      break;
    }

    case 'day_menu': {
      const menuData = data.menu;
      const dayFocus = data.dayFocus;
      const rows = [];
      const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };
      const mealKeys = ['breakfast', 'lunch', 'snacks', 'dinner'];

      if (dayFocus === '__all__' && menuData && Array.isArray(menuData)) {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sorted = [...menuData].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
        for (const day of sorted) {
          for (const mk of mealKeys) {
            const mLower = data.mealFocus ? data.mealFocus.toLowerCase() : '';
            const mCapped = data.mealFocus ? data.mealFocus.charAt(0).toUpperCase() + data.mealFocus.slice(1).toLowerCase() : '';
            const items = (day as any)[mk] || (day as any)[mk.charAt(0).toUpperCase() + mk.slice(1)] || [];
            for (const dish of items) {
              if (dish && dish.name && (!data.mealFocus || mk === mLower || mk.charAt(0).toUpperCase() + mk.slice(1) === mCapped)) {
                rows.push({ day: day.day || '—', meal: mealLabels[mk] || mk, dish: dish.name });
              }
            }
          }
        }
        if (rows.length > 0) {
          charts.push({
            kind: 'table',
            title: 'Weekly Menu',
            columns: [
              { key: 'day', label: 'Day' },
              { key: 'meal', label: 'Meal' },
              { key: 'dish', label: 'Dish' },
            ],
            rows,
          });
        }
      } else if (menuData && menuData.dishes) {
        for (const dish of menuData.dishes) {
          if (dish && dish.name && (!data.mealFocus || (dish.mealType && dish.mealType.toLowerCase() === data.mealFocus.toLowerCase()))) {
            rows.push({ day: dayFocus || menuData.day || '—', meal: mealLabels[dish.mealType && dish.mealType.toLowerCase()] || dish.mealType || '—', dish: dish.name });
          }
        }
        if (rows.length > 0) {
          charts.push({
            kind: 'table',
            title: (dayFocus || menuData.day || 'Menu') + ' Menu',
            columns: [
              { key: 'day', label: 'Day' },
              { key: 'meal', label: 'Meal' },
              { key: 'dish', label: 'Dish' },
            ],
            rows,
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return charts;
}

// ─── Optional Gemini Integration ─────────────────────────────────────────────

const GEMINI_API_KEY = () => import.meta.env.VITE_GEMINI_API_KEY as string;

let _geminiAvailable: boolean | null = null;

/**
 * Check whether the Gemini API key is configured and has quota.
 * Caches the result for 5 minutes to avoid repeated failed calls.
 */
async function isGeminiAvailable(): Promise<boolean> {
  if (_geminiAvailable !== null) return _geminiAvailable;

  const apiKey = GEMINI_API_KEY();
  if (!apiKey || apiKey.includes('your_copied_api_key') || apiKey.length < 10) {
    _geminiAvailable = false;
    return false;
  }

  try {
    // Quick health check — just list models
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    _geminiAvailable = resp.ok;
  } catch {
    _geminiAvailable = false;
  }

  // Reset cache after 5 min
  setTimeout(() => {
    _geminiAvailable = null;
  }, 300_000);

  return _geminiAvailable;
}

async function resolveModel(apiKey: string): Promise<string> {
  const PREFERRED = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-8b',
    'gemini-pro',
    'gemini-1.0-pro',
  ];

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await resp.json();
    if (data.models) {
      const available = data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));
      for (const pref of PREFERRED) {
        if (available.includes(pref)) return pref;
      }
      if (available.length > 0) return available[0];
    }
  } catch {
    // silently fall through
  }
  return 'gemini-2.0-flash';
}

async function callGemini(
  systemPrompt: string,
  userQuery: string,
  history: ChatMessage[]
): Promise<string | null> {
  const apiKey = GEMINI_API_KEY();
  const model = await resolveModel(apiKey);

  const contents: any[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    {
      role: 'model',
      parts: [
        { text: 'Understood. I am the Mess Connect AI Assistant.' },
      ],
    },
  ];

  for (const msg of history.slice(-6)) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: userQuery }] });

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024, topP: 0.9 },
        }),
      }
    );

    if (!resp.ok) return null; // quota or auth error — fallback silently

    const data = await resp.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || null
    );
  } catch {
    return null;
  }
}

function buildSystemPrompt(context: string, data: any, intent: Intent): string {
  const dataJSON = JSON.stringify(data, null, 2);
  const guidance: Record<string, string> = {
    user_count: 'Answer how many users are registered with role breakdown.',
    active_users: 'Answer how many users are currently active.',
    today_feedback_count: 'Tell how many feedback submissions were received today.',
    today_avg_rating: "Report today's average food rating with meal breakdown.",
    highest_meal_week: 'Determine which meal type has the highest average rating this week.',
    lowest_meal_week: 'Determine which meal type has the lowest average rating this week.',
    top_dishes: 'List the top highest-rated dishes.',
    lowest_dishes: 'List the lowest-rated dishes.',
    block_feedback: 'Analyze which hostel block submits the most feedback.',
    most_complaints_day: 'Identify which day received the most complaints.',
    common_complaints: 'List the most common complaint types.',
    today_summary: 'Provide a comprehensive summary of today\'s data.',
    week_insights: 'Give insights based on this week\'s data.',
    unusual_trends: 'Analyze for unusual trends or patterns.',
    dishes_to_improve: 'Suggest which dishes need improvement.',
    most_liked: 'Identify most liked menu items.',
    weekly_report: 'Generate a detailed weekly analytics summary.',
    monthly_report: 'Generate a comprehensive monthly report.',
    week_comparison: 'Compare this week with last week.',
    day_menu: 'Show the menu for the specified day and optional meal type.',
    user_search: 'Search for users by name or email and return matching results.',
    dish_search: 'Search the weekly menu for a specific dish and return when/where it appears.',
    general_analysis: 'Answer the user\'s question based on available data.',
    unknown: 'Answer based on available data.',
  };

  return (
    `You are the Mess Connect AI Assistant for a hostel mess management system.\n\n` +
    `DATA (JSON):\n${dataJSON}\n\n` +
    `Intent: ${guidance[intent] || 'Answer the user question.'}\n\n` +
    `Rules:\n` +
    `- Answer ONLY from the data above. Never hallucinate.\n` +
    `- If data is insufficient, say so clearly.\n` +
    `- Use bullet points, tables, and bold (**) for emphasis.\n` +
    `- Be concise and professional.\n` +
    `- Keep under 500 words unless a detailed breakdown was requested.`
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Public API ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process a natural-language query:
 * 1. Classify intent from the question
 * 2. Fetch only the relevant Firebase data
 * 3. Generate a human-readable answer using the local engine
 * 4. If Gemini is available, try it for a richer response (falls back to local)
 */
export async function processQuery(
  _query: string,
  history: ChatMessage[]
): Promise<AIResponse> {
  // ── Security filter: never reveal passwords, credentials, or sensitive auth data ──
  const passwordPatterns = /\b(password|passwd|pwd|credentials?|secret|auth\s*token|session|login\s*cred|sign\s*in)\b/i;
  if (passwordPatterns.test(_query)) {
    return {
      text: "🔒 **I can't share that.**\n\nI'm sorry, but I can't share passwords or other confidential credentials. Please contact the system administrator if you need account access.",
    };
  }

  try {
    const { intent, mealFocus, dayFocus, searchName, searchDish, complaintDetail, timeframe } = classifyIntent(_query);

    // Fetch only what's needed from Firebase
    const { context, data } = await fetchDataForIntent(intent, mealFocus, dayFocus, searchName, searchDish, timeframe);
    // Generate a local answer first (always works)
    const localAnswer = generateLocalAnswer(intent, data, _query, complaintDetail);

    // Generate chart data from the same fetched data
    const charts = generateChartData(intent, data, _query);

    // Try Gemini for an enhanced answer (optional — swallows failures silently)
    const geminiAvailable = await isGeminiAvailable();
    if (geminiAvailable) {
      const systemPrompt = buildSystemPrompt(context, data, intent);
      const geminiAnswer = await callGemini(systemPrompt, _query, history);
      if (geminiAnswer) {
        return { text: geminiAnswer, charts };
      }
    }

    // Fallback to local answer with charts
    return { text: localAnswer, charts };
  } catch (error: any) {
    console.error('processQuery error:', error);
    return {
      text: '',
      error:
        error.message ||
        'An unexpected error occurred while processing your request.',
    };
  }
}

/**
 * Invalidate the Gemini availability cache (e.g., after user updates their API key).
 */
export function resetGeminiCache(): void {
  _geminiAvailable = null;
}
