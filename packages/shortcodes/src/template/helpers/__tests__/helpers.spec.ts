import { acfHelpers } from '../acf';
import { relationHelpers } from '../relation';
import { mediaHelpers } from '../media';
import { formatHelpers } from '../format';
import { conditionalHelpers } from '../conditional';
import { collectionHelpers } from '../collection';
import { mathHelpers } from '../math';

describe('Template Helpers', () => {
  describe('ACF Helpers', () => {
    const context = {
      acfFields: {
        price: 25000,
        featured_image: { url: '/image.jpg', sizes: { thumbnail: '/thumb.jpg' } },
        author_relation: { id: 1, name: 'John Doe' },
        gallery: [
          { url: '/img1.jpg', sizes: { thumbnail: '/thumb1.jpg' } },
          { url: '/img2.jpg', sizes: { thumbnail: '/thumb2.jpg' } }
        ],
        is_featured: true,
        product_link: { url: 'https://example.com', title: 'Product', target: '_blank' }
      }
    };

    it('should get ACF field value', () => {
      const result = acfHelpers.acf.call(context, 'price', { data: { root: context } });
      expect(result).toBe(25000);
    });

    it('should return fallback for missing ACF field', () => {
      const result = acfHelpers.acf.call(context, 'missing', 'default', { data: { root: context } });
      expect(result).toBe('default');
    });

    it('should get ACF image URL', () => {
      const result = acfHelpers.acfImage.call(context, 'featured_image', 'thumbnail', { data: { root: context } });
      expect(result).toBe('/thumb.jpg');
    });

    it('should get ACF relation property', () => {
      const result = acfHelpers.acfRelation.call(context, 'author_relation', 'name', { data: { root: context } });
      expect(result).toBe('John Doe');
    });

    it('should handle ACF gallery', () => {
      const result = acfHelpers.acfGallery.call(context, 'gallery', 'thumbnail', { data: { root: context } });
      expect(result).toEqual(['/thumb1.jpg', '/thumb2.jpg']);
    });

    it('should check if ACF field exists', () => {
      const result = acfHelpers.hasAcf.call(context, 'is_featured', { data: { root: context } });
      expect(result).toBe(true);
    });

    it('should handle ACF boolean field', () => {
      const result = acfHelpers.acfBool.call(context, 'is_featured', 'Yes', 'No', { data: { root: context } });
      expect(result).toBe('Yes');
    });

    it('should generate ACF link HTML', () => {
      const result = acfHelpers.acfLink.call(context, 'product_link', { data: { root: context } });
      expect(result).toBe('<a href="https://example.com" target="_blank">Product</a>');
    });
  });

  describe('Relation Helpers', () => {
    const context = {
      author: { id: 1, name: 'John Doe', email: 'john@example.com' },
      category: { id: 5, name: 'Technology', slug: 'tech' },
      tags: [
        { id: 1, name: 'JavaScript' },
        { id: 2, name: 'TypeScript' }
      ],
      parent: { id: 10, title: 'Parent Post' },
      children: [
        { id: 20, title: 'Child 1' },
        { id: 21, title: 'Child 2' }
      ]
    };

    it('should get author field', () => {
      const result = relationHelpers.author.call(context, 'name', { data: { root: context } });
      expect(result).toBe('John Doe');
    });

    it('should get category field', () => {
      const result = relationHelpers.category.call(context, 'slug', { data: { root: context } });
      expect(result).toBe('tech');
    });

    it('should join tags', () => {
      const result = relationHelpers.tags.call(context, ', ', 'name', { data: { root: context } });
      expect(result).toBe('JavaScript, TypeScript');
    });

    it('should get parent field', () => {
      const result = relationHelpers.parent.call(context, 'title', { data: { root: context } });
      expect(result).toBe('Parent Post');
    });

    it('should get children count', () => {
      const result = relationHelpers.children.call(context, undefined, undefined, { data: { root: context } });
      expect(result).toHaveLength(2);
    });

    it('should check if has relation', () => {
      const result = relationHelpers.hasRelation.call(context, 'author', { data: { root: context } });
      expect(result).toBe(true);
    });
  });

  describe('Media Helpers', () => {
    const context = {
      thumbnail: { url: '/thumb.jpg', sizes: { medium: '/medium.jpg' } },
      gallery: [
        { url: '/img1.jpg', sizes: { thumbnail: '/thumb1.jpg' } },
        { url: '/img2.jpg', sizes: { thumbnail: '/thumb2.jpg' } }
      ],
      $settings: { mediaUrl: '/media' }
    };

    it('should get media URL', () => {
      const result = mediaHelpers.media(123, 'full', { data: { root: context } });
      expect(result).toBe('/media/123/full');
    });

    it('should get thumbnail URL', () => {
      const result = mediaHelpers.thumbnail.call(context, 'medium', { data: { root: context } });
      expect(result).toBe('/medium.jpg');
    });

    it('should generate srcset', () => {
      const result = mediaHelpers.srcset(123, undefined, { data: { root: context } });
      expect(result).toContain('/media/123/small 300w');
      expect(result).toContain('/media/123/large 1024w');
    });

    it('should generate img tag', () => {
      const result = mediaHelpers.img('/image.jpg', 'Alt text', 'img-class');
      expect(result).toBe('<img src="/image.jpg" alt="Alt text" class="img-class" />');
    });

    it('should check if has media', () => {
      const result = mediaHelpers.hasMedia.call(context, 'thumbnail', { data: { root: context } });
      expect(result).toBe(true);
    });

    it('should handle gallery', () => {
      const result = mediaHelpers.gallery.call(context, 'thumbnail', undefined, { data: { root: context } });
      expect(result).toEqual(['/thumb1.jpg', '/thumb2.jpg']);
    });
  });

  describe('Format Helpers', () => {
    it('should format price', () => {
      const result = formatHelpers.priceFormat(25000, 'KRW');
      expect(result).toContain('25');
      expect(result).toContain('000');
    });

    it('should format date', () => {
      const result = formatHelpers.dateFormat('2024-01-15', 'YYYY-MM-DD');
      expect(result).toBe('2024-01-15');
    });

    it('should format number', () => {
      const result = formatHelpers.numberFormat(1234567, 2);
      expect(result).toBe('1234567.00');
    });

    it('should create excerpt', () => {
      const longText = 'This is a very long text that needs to be truncated. '.repeat(10);
      const result = formatHelpers.excerpt(longText, 50, '...');
      expect(result.length).toBeLessThanOrEqual(53);
      expect(result).toEndWith('...');
    });

    it('should convert to uppercase', () => {
      const result = formatHelpers.uppercase('hello world');
      expect(result).toBe('HELLO WORLD');
    });

    it('should convert to title case', () => {
      const result = formatHelpers.titleCase('hello world example');
      expect(result).toBe('Hello World Example');
    });

    it('should strip HTML', () => {
      const result = formatHelpers.stripHtml('<p>Hello <strong>World</strong></p>');
      expect(result).toBe('Hello World');
    });

    it('should format file size', () => {
      const result = formatHelpers.fileSize(1024 * 1024 * 5.5, 1);
      expect(result).toBe('5.5 MB');
    });

    it('should format percentage', () => {
      const result = formatHelpers.percent(0.856, 1);
      expect(result).toBe('85.6%');
    });

    it('should format phone number', () => {
      const result = formatHelpers.phoneFormat('01012345678');
      expect(result).toBe('010-1234-5678');
    });

    it('should pluralize', () => {
      expect(formatHelpers.pluralize(1, 'item')).toBe('item');
      expect(formatHelpers.pluralize(2, 'item')).toBe('items');
      expect(formatHelpers.pluralize(5, 'box', 'boxes')).toBe('boxes');
    });

    it('should format time ago', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const result = formatHelpers.timeAgo(fiveMinutesAgo);
      expect(result).toBe('5분 전');
    });
  });

  describe('Conditional Helpers', () => {
    it('should handle if condition', () => {
      expect(conditionalHelpers.if(true, 'yes', 'no')).toBe('yes');
      expect(conditionalHelpers.if(false, 'yes', 'no')).toBe('no');
    });

    it('should handle equality checks', () => {
      expect(conditionalHelpers.eq(5, 5)).toBe(true);
      expect(conditionalHelpers.ne(5, 3)).toBe(true);
    });

    it('should handle comparison operators', () => {
      expect(conditionalHelpers.gt(10, 5)).toBe(true);
      expect(conditionalHelpers.gte(10, 10)).toBe(true);
      expect(conditionalHelpers.lt(5, 10)).toBe(true);
      expect(conditionalHelpers.lte(10, 10)).toBe(true);
    });

    it('should check if value is in array', () => {
      expect(conditionalHelpers.in('apple', ['apple', 'banana'])).toBe(true);
      expect(conditionalHelpers.notIn('orange', ['apple', 'banana'])).toBe(true);
    });

    it('should handle logical operators', () => {
      const options = {};
      expect(conditionalHelpers.and(true, true, true, options)).toBe(true);
      expect(conditionalHelpers.or(false, false, true, options)).toBe(true);
      expect(conditionalHelpers.not(false)).toBe(true);
    });

    it('should check emptiness', () => {
      expect(conditionalHelpers.empty([])).toBe(true);
      expect(conditionalHelpers.empty('')).toBe(true);
      expect(conditionalHelpers.notEmpty([1, 2])).toBe(true);
    });

    it('should check type', () => {
      expect(conditionalHelpers.typeof('hello', 'string')).toBe(true);
      expect(conditionalHelpers.typeof([], 'array')).toBe(true);
    });

    it('should check even/odd', () => {
      expect(conditionalHelpers.even(4)).toBe(true);
      expect(conditionalHelpers.odd(5)).toBe(true);
    });
  });

  describe('Collection Helpers', () => {
    const array = [3, 1, 4, 1, 5, 9, 2, 6];
    const objects = [
      { id: 1, name: 'Alice', score: 85 },
      { id: 2, name: 'Bob', score: 92 },
      { id: 3, name: 'Charlie', score: 85 }
    ];

    it('should join array', () => {
      expect(collectionHelpers.join(['a', 'b', 'c'], ', ')).toBe('a, b, c');
    });

    it('should count array', () => {
      expect(collectionHelpers.count(array)).toBe(8);
    });

    it('should get first/last elements', () => {
      expect(collectionHelpers.first(array)).toBe(3);
      expect(collectionHelpers.first(array, 3)).toEqual([3, 1, 4]);
      expect(collectionHelpers.last(array)).toBe(6);
      expect(collectionHelpers.last(array, 2)).toEqual([2, 6]);
    });

    it('should get element at index', () => {
      expect(collectionHelpers.at(array, 2)).toBe(4);
      expect(collectionHelpers.at(array, -1)).toBe(6);
    });

    it('should slice array', () => {
      expect(collectionHelpers.slice(array, 2, 5)).toEqual([4, 1, 5]);
    });

    it('should reverse array', () => {
      expect(collectionHelpers.reverse([1, 2, 3])).toEqual([3, 2, 1]);
    });

    it('should sort array', () => {
      expect(collectionHelpers.sort([3, 1, 2])).toEqual([1, 2, 3]);
      expect(collectionHelpers.sort(objects, 'name')).toHaveProperty([0, 'name'], 'Alice');
    });

    it('should filter array', () => {
      const filtered = collectionHelpers.filter(objects, 'score', 85);
      expect(filtered).toHaveLength(2);
    });

    it('should map array', () => {
      const names = collectionHelpers.map(objects, 'name');
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should find in array', () => {
      const found = collectionHelpers.find(objects, 'name', 'Bob');
      expect(found).toHaveProperty('id', 2);
    });

    it('should get unique values', () => {
      expect(collectionHelpers.unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    });

    it('should group by field', () => {
      const grouped = collectionHelpers.groupBy(objects, 'score');
      expect(grouped['85']).toHaveLength(2);
      expect(grouped['92']).toHaveLength(1);
    });

    it('should chunk array', () => {
      const chunks = collectionHelpers.chunk([1, 2, 3, 4, 5], 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should pluck values', () => {
      const scores = collectionHelpers.pluck(objects, 'score');
      expect(scores).toEqual([85, 92, 85]);
    });
  });

  describe('Math Helpers', () => {
    const numbers = [10, 20, 30, 40, 50];
    const items = [
      { price: 100, quantity: 2 },
      { price: 200, quantity: 3 },
      { price: 150, quantity: 1 }
    ];

    it('should calculate sum', () => {
      expect(mathHelpers.sum(undefined as any, numbers)).toBe(150);
      expect(mathHelpers.sum('price', items)).toBe(450);
    });

    it('should calculate average', () => {
      expect(mathHelpers.avg(undefined as any, numbers)).toBe(30);
      expect(mathHelpers.avg('price', items)).toBe(150);
    });

    it('should find min/max', () => {
      expect(mathHelpers.min(undefined as any, numbers)).toBe(10);
      expect(mathHelpers.max(undefined as any, numbers)).toBe(50);
      expect(mathHelpers.min('price', items)).toBe(100);
      expect(mathHelpers.max('price', items)).toBe(200);
    });

    it('should evaluate math expression', () => {
      const context = { a: 10, b: 20 };
      const result = mathHelpers.math.call(context, 'a + b * 2', { data: { root: context } });
      expect(result).toBe(50);
    });

    it('should handle basic arithmetic', () => {
      expect(mathHelpers.add(10, 5)).toBe(15);
      expect(mathHelpers.subtract(10, 5)).toBe(5);
      expect(mathHelpers.multiply(10, 5)).toBe(50);
      expect(mathHelpers.divide(10, 5)).toBe(2);
      expect(mathHelpers.mod(10, 3)).toBe(1);
    });

    it('should handle power and sqrt', () => {
      expect(mathHelpers.pow(2, 3)).toBe(8);
      expect(mathHelpers.sqrt(16)).toBe(4);
    });

    it('should handle rounding', () => {
      expect(mathHelpers.round(3.14159, 2)).toBe(3.14);
      expect(mathHelpers.floor(3.9)).toBe(3);
      expect(mathHelpers.ceil(3.1)).toBe(4);
    });

    it('should generate range', () => {
      const range = mathHelpers.range(1, 5, 1, {});
      expect(range).toEqual([1, 2, 3, 4, 5]);
    });
  });
});