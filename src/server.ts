import express from 'express';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { z } from 'zod';

function log(level: string, event: string, data: Record<string, unknown> = {}) {
  process.stderr.write(JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...data }) + '\n');
}

function getCurrentDateTime(timezone?: string) {
  const now = new Date();
  const tz = timezone || 'UTC';

  try {
    return {
      iso8601: now.toISOString(),
      unix_timestamp: Math.floor(now.getTime() / 1000),
      unix_milliseconds: now.getTime(),
      human_readable: now.toLocaleString('en-US', { timeZone: tz }),
      date_only: now.toLocaleDateString('en-US', { timeZone: tz }),
      time_only: now.toLocaleTimeString('en-US', { timeZone: tz }),
      timezone: tz,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz }),
    };
  } catch {
    throw new Error(`Invalid timezone: ${tz}. Use IANA timezone names like "America/New_York" or "UTC".`);
  }
}

function parseDate(dateString: string, timezone?: string) {
  const tz = timezone || 'UTC';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string');
    }

    return {
      iso8601: date.toISOString(),
      unix_timestamp: Math.floor(date.getTime() / 1000),
      unix_milliseconds: date.getTime(),
      human_readable: date.toLocaleString('en-US', { timeZone: tz }),
      date_only: date.toLocaleDateString('en-US', { timeZone: tz }),
      time_only: date.toLocaleTimeString('en-US', { timeZone: tz }),
      timezone: tz,
      is_valid: true,
    };
  } catch {
    return {
      is_valid: false,
      error: `Could not parse date: ${dateString}`,
    };
  }
}

function formatDate(dateString: string, format: string, timezone?: string) {
  const tz = timezone || 'UTC';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date string');
  }

  switch (format) {
    case 'iso':
      return { formatted: date.toISOString(), format: 'ISO 8601' };
    case 'unix':
      return { formatted: Math.floor(date.getTime() / 1000).toString(), format: 'Unix Timestamp' };
    case 'date-only':
      return { formatted: date.toISOString().split('T')[0], format: 'YYYY-MM-DD' };
    case 'time-only':
      return { formatted: date.toISOString().split('T')[1].split('.')[0], format: 'HH:MM:SS' };
    case 'datetime':
      return { formatted: date.toLocaleString('en-US', { timeZone: tz }), format: 'Human Readable', timezone: tz };
    case 'relative': {
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffSecs = Math.floor(Math.abs(diffMs) / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let relative = '';
      if (diffDays > 0) {
        relative = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        relative = `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      } else if (diffMins > 0) {
        relative = `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
      } else {
        relative = `${diffSecs} second${diffSecs !== 1 ? 's' : ''}`;
      }

      relative += diffMs < 0 ? ' ago' : ' from now';

      return { formatted: relative, format: 'Relative', reference_time: now.toISOString() };
    }
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

function calculateDateDifference(startDate: string, endDate: string, unit: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date string(s)');
  }

  const diffMs = end.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (unit === 'all') {
    return {
      milliseconds: diffMs,
      seconds: diffSecs,
      minutes: diffMins,
      hours: diffHours,
      days: diffDays,
      human_readable: `${Math.abs(diffDays)} days, ${Math.abs(diffHours % 24)} hours, ${Math.abs(diffMins % 60)} minutes, ${Math.abs(diffSecs % 60)} seconds`,
      is_past: diffMs < 0,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    };
  }

  let value: number;
  switch (unit) {
    case 'seconds': value = diffSecs; break;
    case 'minutes': value = diffMins; break;
    case 'hours': value = diffHours; break;
    case 'days': value = diffDays; break;
    default: throw new Error(`Unknown unit: ${unit}`);
  }

  return {
    difference: value,
    unit,
    is_past: diffMs < 0,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  };
}

function addTimeToDate(dateString: string, amount: number, unit: string, timezone?: string) {
  const tz = timezone || 'UTC';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date string');
  }

  const result = new Date(date);

  switch (unit) {
    case 'seconds': result.setSeconds(result.getSeconds() + amount); break;
    case 'minutes': result.setMinutes(result.getMinutes() + amount); break;
    case 'hours': result.setHours(result.getHours() + amount); break;
    case 'days': result.setDate(result.getDate() + amount); break;
    case 'months': result.setMonth(result.getMonth() + amount); break;
    case 'years': result.setFullYear(result.getFullYear() + amount); break;
    default: throw new Error(`Unknown unit: ${unit}`);
  }

  return {
    original_date: date.toISOString(),
    result_date: result.toISOString(),
    operation: `${amount >= 0 ? '+' : ''}${amount} ${unit}`,
    human_readable: result.toLocaleString('en-US', { timeZone: tz }),
    timezone: tz,
  };
}

function generateDateList(startDate: string | undefined, count: number, unit: string, timezone?: string) {
  const tz = timezone || 'UTC';

  const start = startDate ? new Date(startDate) : new Date();
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start date');
  }

  if (!['days', 'weeks', 'months', 'years'].includes(unit)) {
    throw new Error(`Invalid unit: ${unit}. Must be one of: days, weeks, months, years`);
  }

  const dates = [];
  const direction = count >= 0 ? 1 : -1;
  const absCount = Math.abs(count);

  for (let i = 0; i < absCount; i++) {
    const currentDate = new Date(start);
    const offset = i * direction;

    switch (unit) {
      case 'days': currentDate.setDate(currentDate.getDate() + offset); break;
      case 'weeks': currentDate.setDate(currentDate.getDate() + offset * 7); break;
      case 'months': currentDate.setMonth(currentDate.getMonth() + offset); break;
      case 'years': currentDate.setFullYear(currentDate.getFullYear() + offset); break;
    }

    const isoDate = currentDate.toISOString();
    const formatted = currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz,
    });
    const dayOfWeek = currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: tz,
    });

    const now = new Date();
    const diffMs = currentDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let relative = '';
    if (diffDays === 0) {
      relative = 'today';
    } else if (diffDays === 1) {
      relative = 'tomorrow';
    } else if (diffDays === -1) {
      relative = 'yesterday';
    } else if (diffDays > 0) {
      relative = `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      relative = `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    }

    dates.push({
      date: isoDate,
      formatted,
      day_of_week: dayOfWeek,
      relative,
    });
  }

  return {
    dates,
    count: absCount,
    unit,
    start_date: start.toISOString(),
    direction: count >= 0 ? 'future' : 'past',
    timezone: tz,
  };
}

const formatEnum = z.enum(['iso', 'unix', 'date-only', 'time-only', 'datetime', 'relative']);
const diffUnitEnum = z.enum(['days', 'hours', 'minutes', 'seconds', 'all']);
const addUnitEnum = z.enum(['years', 'months', 'days', 'hours', 'minutes', 'seconds']);
const listUnitEnum = z.enum(['days', 'weeks', 'months', 'years']);

function toolResult(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message, success: false }, null, 2) }],
    isError: true as const,
  };
}

const handler = createMcpHandler(() => {
  const server = new McpServer(
    { name: 'mcp-date-time', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool('get-current-datetime', {
    description: 'Get the current date and time. ALWAYS use this tool when you need to know what time or date it is right now. Returns current datetime in multiple formats including ISO 8601, Unix timestamp, and human-readable format.',
    inputSchema: {
      timezone: z.string().describe('Optional timezone (e.g., "America/New_York", "Europe/London", "UTC"). Defaults to UTC.').optional(),
    },
  }, async ({ timezone }) => {
    try {
      return toolResult(getCurrentDateTime(timezone));
    } catch (error) {
      log('error', 'tool_error', { tool: 'get-current-datetime', error: String(error) });
      return toolError(error);
    }
  });

  server.registerTool('parse-date', {
    description: 'Parse and validate a date string. Use this to verify if a date string is valid and get it in standardized formats. Returns the parsed date in ISO 8601, Unix timestamp, and human-readable format.',
    inputSchema: {
      dateString: z.string().describe('The date string to parse (e.g., "2024-03-15", "March 15, 2024", "2024-03-15T10:30:00Z")'),
      timezone: z.string().describe('Optional timezone for the parsed date. Defaults to UTC.').optional(),
    },
  }, async ({ dateString, timezone }) => {
    try {
      return toolResult(parseDate(dateString, timezone));
    } catch (error) {
      log('error', 'tool_error', { tool: 'parse-date', error: String(error) });
      return toolError(error);
    }
  });

  server.registerTool('format-date', {
    description: 'Format a date according to a specific pattern. Use this to convert dates between different formats.',
    inputSchema: {
      dateString: z.string().describe('The date to format (ISO 8601 format recommended)'),
      format: formatEnum.describe('The desired output format'),
      timezone: z.string().describe('Optional timezone. Defaults to UTC.').optional(),
    },
  }, async ({ dateString, format, timezone }) => {
    try {
      return toolResult(formatDate(dateString, format, timezone));
    } catch (error) {
      log('error', 'tool_error', { tool: 'format-date', error: String(error) });
      return toolError(error);
    }
  });

  server.registerTool('calculate-date-difference', {
    description: 'Calculate the difference between two dates. Returns the difference in days, hours, minutes, and seconds.',
    inputSchema: {
      startDate: z.string().describe('The start date (ISO 8601 format recommended)'),
      endDate: z.string().describe('The end date (ISO 8601 format recommended)'),
      unit: diffUnitEnum.describe('The unit to return the difference in'),
    },
  }, async ({ startDate, endDate, unit }) => {
    try {
      return toolResult(calculateDateDifference(startDate, endDate, unit));
    } catch (error) {
      log('error', 'tool_error', { tool: 'calculate-date-difference', error: String(error) });
      return toolError(error);
    }
  });

  server.registerTool('add-time-to-date', {
    description: 'Add or subtract time from a date. Use positive numbers to add time, negative numbers to subtract.',
    inputSchema: {
      dateString: z.string().describe('The starting date (ISO 8601 format recommended)'),
      amount: z.number().describe('The amount to add (positive) or subtract (negative)'),
      unit: addUnitEnum.describe('The unit of time to add/subtract'),
      timezone: z.string().describe('Optional timezone. Defaults to UTC.').optional(),
    },
  }, async ({ dateString, amount, unit, timezone }) => {
    try {
      return toolResult(addTimeToDate(dateString, amount, unit, timezone));
    } catch (error) {
      log('error', 'tool_error', { tool: 'add-time-to-date', error: String(error) });
      return toolError(error);
    }
  });

  server.registerTool('generate-date-list', {
    description: 'Generate a list of dates into the future or past. Use positive count for future dates, negative for past dates. Returns an array of dates with formatted strings, day of week, and relative time descriptions.',
    inputSchema: {
      startDate: z.string().describe('Optional starting date (ISO 8601 format). Defaults to current date/time.').optional(),
      count: z.number().describe('Number of dates to generate. Positive for future, negative for past.'),
      unit: listUnitEnum.describe('The time unit for incrementing dates'),
      timezone: z.string().describe('Optional timezone for formatting. Defaults to UTC.').optional(),
    },
  }, async ({ startDate, count, unit, timezone }) => {
    try {
      return toolResult(generateDateList(startDate, count, unit, timezone));
    } catch (error) {
      log('error', 'tool_error', { tool: 'generate-date-list', error: String(error) });
      return toolError(error);
    }
  });

  return server;
});

const app = express();

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'mcp-date-time' });
});

app.get('/ready', (_req, res) => {
  res.status(200).json({ status: 'ready', service: 'mcp-date-time' });
});

const nodeHandler = toNodeHandler(handler);
app.all('/mcp', (req, res) => { void nodeHandler(req, res); });

const port = parseInt(process.env.PORT || '8080', 10);
app.listen(port, () => log('info', 'server_start', { port }));

process.on('SIGTERM', async () => {
  log('info', 'shutdown_initiated');
  await handler.close();
  process.exit(0);
});
