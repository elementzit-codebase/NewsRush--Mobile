export interface TemplateBlock {
  section_key: string;
  section_name: string;
  span: number;
  size: 'lead' | 'body' | 'tall' | 'small';
  charLimit: number;
  page_number?: number;
}

export interface PageTemplate {
  key: string;
  name: string;
  description: string;
  rows: {
    weight: number;
    blocks: [string, number, 'lead' | 'body' | 'tall' | 'small'][];
  }[];
}

export const CANONICAL_SECTIONS: Record<string, { section_key: string; section_name: string; defaultCharLimit: number }> = {
  // Page 1
  main_breaking_news: { section_key: 'main_breaking_news', section_name: 'Main Breaking News', defaultCharLimit: 3960 },
  kerala_highlights: { section_key: 'kerala_highlights', section_name: 'Kerala Highlights', defaultCharLimit: 2775 },
  local_highlights: { section_key: 'local_highlights', section_name: 'Local Highlights', defaultCharLimit: 1350 },
  short_news: { section_key: 'short_news', section_name: 'Short News', defaultCharLimit: 2475 },
  // Page 2
  kerala_news: { section_key: 'kerala_news', section_name: 'Kerala News', defaultCharLimit: 2886 },
  district_news: { section_key: 'district_news', section_name: 'District News', defaultCharLimit: 1404 },
  politics: { section_key: 'politics', section_name: 'Politics', defaultCharLimit: 2886 },
  crime_civic: { section_key: 'crime_civic', section_name: 'Crime / Civic News', defaultCharLimit: 1404 },
  short_news_2: { section_key: 'short_news_2', section_name: 'Short News', defaultCharLimit: 2640 },
  // Page 3
  sports: { section_key: 'sports', section_name: 'Sports', defaultCharLimit: 4200 },
  cricket_football: { section_key: 'cricket_football', section_name: 'Cricket/Football', defaultCharLimit: 2430 },
  business: { section_key: 'business', section_name: 'Business', defaultCharLimit: 1566 },
  cinema: { section_key: 'cinema', section_name: 'Cinema', defaultCharLimit: 1566 },
  entertainment: { section_key: 'entertainment', section_name: 'Entertainment', defaultCharLimit: 1566 },
  // Page 4
  special_story: { section_key: 'special_story', section_name: 'Special Story', defaultCharLimit: 4200 },
  human_interest: { section_key: 'human_interest', section_name: 'Human Interest', defaultCharLimit: 2430 },
  evening_updates: { section_key: 'evening_updates', section_name: 'Evening Updates', defaultCharLimit: 1566 },
  tomorrow: { section_key: 'tomorrow', section_name: "Tomorrow / What's Next", defaultCharLimit: 1566 },
  short_news_4: { section_key: 'short_news_4', section_name: 'Short News', defaultCharLimit: 1566 },
};

export const PAGE_TEMPLATES: Record<number, PageTemplate[]> = {
  1: [
    {
      key: 'classic',
      name: 'Classic',
      description: 'Full-width lead over a two-column spread.',
      rows: [
        { weight: 3, blocks: [['main_breaking_news', 3, 'lead']] },
        { weight: 3, blocks: [['kerala_highlights', 2, 'body'], ['local_highlights', 1, 'tall']] },
        { weight: 2, blocks: [['short_news', 3, 'small']] },
      ],
    },
    {
      key: 'bold-lead',
      name: 'Bold Lead',
      description: 'Dominant front story with three briefs beneath.',
      rows: [
        { weight: 4, blocks: [['main_breaking_news', 3, 'lead']] },
        {
          weight: 2,
          blocks: [
            ['kerala_highlights', 1, 'small'],
            ['local_highlights', 1, 'small'],
            ['short_news', 1, 'small'],
          ],
        },
      ],
    },
    {
      key: 'sidebar',
      name: 'Side Column',
      description: 'Lead beside a standing column, briefs below.',
      rows: [
        { weight: 3, blocks: [['main_breaking_news', 2, 'lead'], ['local_highlights', 1, 'tall']] },
        { weight: 3, blocks: [['kerala_highlights', 2, 'body'], ['short_news', 1, 'tall']] },
      ],
    },
  ],

  2: [
    {
      key: 'classic',
      name: 'Classic',
      description: 'Two paired stories over a full-width brief.',
      rows: [
        { weight: 3, blocks: [['kerala_news', 2, 'body'], ['district_news', 1, 'tall']] },
        { weight: 3, blocks: [['politics', 2, 'body'], ['crime_civic', 1, 'tall']] },
        { weight: 2, blocks: [['short_news_2', 3, 'small']] },
      ],
    },
    {
      key: 'stacked',
      name: 'Stacked',
      description: 'Regional lead across the page, pairs below.',
      rows: [
        { weight: 3, blocks: [['kerala_news', 3, 'lead']] },
        { weight: 3, blocks: [['politics', 2, 'body'], ['district_news', 1, 'tall']] },
        { weight: 2, blocks: [['crime_civic', 2, 'body'], ['short_news_2', 1, 'small']] },
      ],
    },
    {
      key: 'grid',
      name: 'Grid',
      description: 'Three equal columns over a wide pair.',
      rows: [
        {
          weight: 3,
          blocks: [['kerala_news', 1, 'tall'], ['district_news', 1, 'tall'], ['politics', 1, 'tall']],
        },
        { weight: 3, blocks: [['crime_civic', 2, 'body'], ['short_news_2', 1, 'tall']] },
      ],
    },
  ],

  3: [
    {
      key: 'classic',
      name: 'Classic',
      description: 'Sports lead with a results column and three briefs.',
      rows: [
        { weight: 3, blocks: [['sports', 2, 'body'], ['cricket_football', 1, 'tall']] },
        {
          weight: 2,
          blocks: [['business', 1, 'small'], ['cinema', 1, 'small'], ['entertainment', 1, 'small']],
        },
      ],
    },
    {
      key: 'feature',
      name: 'Feature',
      description: 'Full-width sports feature above the rest.',
      rows: [
        { weight: 3, blocks: [['sports', 3, 'lead']] },
        {
          weight: 3,
          blocks: [['cricket_football', 1, 'tall'], ['business', 1, 'tall'], ['cinema', 1, 'tall']],
        },
        { weight: 2, blocks: [['entertainment', 3, 'small']] },
      ],
    },
    {
      key: 'split',
      name: 'Split',
      description: 'Paired stories down the page, wide closer.',
      rows: [
        { weight: 3, blocks: [['sports', 2, 'body'], ['business', 1, 'tall']] },
        { weight: 3, blocks: [['cricket_football', 2, 'body'], ['cinema', 1, 'tall']] },
        { weight: 2, blocks: [['entertainment', 3, 'small']] },
      ],
    },
  ],

  4: [
    {
      key: 'classic',
      name: 'Classic',
      description: 'Special story with a sidebar and three closers.',
      rows: [
        { weight: 3, blocks: [['special_story', 2, 'body'], ['human_interest', 1, 'tall']] },
        {
          weight: 2,
          blocks: [
            ['evening_updates', 1, 'small'],
            ['tomorrow', 1, 'small'],
            ['short_news_4', 1, 'small'],
          ],
        },
      ],
    },
    {
      key: 'feature',
      name: 'Feature',
      description: 'Long read across the page, notes beneath.',
      rows: [
        { weight: 4, blocks: [['special_story', 3, 'lead']] },
        { weight: 3, blocks: [['human_interest', 2, 'body'], ['evening_updates', 1, 'tall']] },
        { weight: 2, blocks: [['tomorrow', 1, 'small'], ['short_news_4', 2, 'small']] },
      ],
    },
    {
      key: 'digest',
      name: 'Digest',
      description: 'Even three-up digest over a wide close.',
      rows: [
        {
          weight: 3,
          blocks: [
            ['special_story', 1, 'tall'],
            ['human_interest', 1, 'tall'],
            ['evening_updates', 1, 'tall'],
          ],
        },
        { weight: 3, blocks: [['tomorrow', 2, 'body'], ['short_news_4', 1, 'tall']] },
      ],
    },
  ],
};

export const DEFAULT_TEMPLATE = 'classic';

export const templatesForPage = (pageNumber: number): PageTemplate[] =>
  PAGE_TEMPLATES[pageNumber] || [];

export function templateFor(pageNumber: number, templateKey: string): PageTemplate {
  const options = templatesForPage(pageNumber);
  return options.find(o => o.key === templateKey) || options[0];
}

const CAPACITY_MULTIPLIERS: Record<string, number> = {
  lead: 1.0,
  body: 0.7,
  tall: 0.35,
  small: 0.25,
};

export function buildPage(pageNumber: number, templateKey: string) {
  const template = templateFor(pageNumber, templateKey);

  const blocks: TemplateBlock[] = [];
  template.rows.forEach(row => {
    row.blocks.forEach(([key, span, size]) => {
      const meta = CANONICAL_SECTIONS[key] || { section_key: key, section_name: key, defaultCharLimit: 2000 };
      const charLimit = Math.round(meta.defaultCharLimit * (CAPACITY_MULTIPLIERS[size] || 0.5));
      blocks.push({
        section_key: key,
        section_name: meta.section_name,
        span,
        size,
        charLimit: charLimit > 0 ? charLimit : meta.defaultCharLimit,
        page_number: pageNumber,
      });
    });
  });

  return {
    pageNumber,
    templateKey: template.key,
    templateName: template.name,
    description: template.description,
    blocks,
  };
}
