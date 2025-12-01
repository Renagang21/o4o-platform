import * as assert from 'assert';
import { parseReactToBlocks } from '../../converter/reactToBlocks';

suite('Conversion Test Suite', () => {
    test('Converts Heading', () => {
        const code = '<h1>Hello World</h1>';
        const blocks = parseReactToBlocks(code);
        assert.strictEqual(blocks.length, 1);
        assert.strictEqual(blocks[0].type, 'o4o/heading');
        assert.strictEqual(blocks[0].attributes.level, 1);
        assert.strictEqual(blocks[0].attributes.content, 'Hello World');
    });

    test('Converts Paragraph with Tailwind', () => {
        const code = '<p className="text-xl text-center">Content</p>';
        const blocks = parseReactToBlocks(code);
        assert.strictEqual(blocks.length, 1);
        assert.strictEqual(blocks[0].type, 'o4o/paragraph');
        assert.strictEqual(blocks[0].attributes.fontSize, 20);
        assert.strictEqual(blocks[0].attributes.align, 'center');
    });

    test('Converts Image', () => {
        const code = '<img src="image.jpg" alt="Alt Text" />';
        const blocks = parseReactToBlocks(code);
        assert.strictEqual(blocks.length, 1);
        assert.strictEqual(blocks[0].type, 'o4o/image');
        assert.strictEqual(blocks[0].attributes.url, 'image.jpg');
        assert.strictEqual(blocks[0].attributes.alt, 'Alt Text');
    });

    test('Converts Group/Div', () => {
        const code = '<div><p>Child</p></div>';
        const blocks = parseReactToBlocks(code);
        assert.strictEqual(blocks.length, 1);
        assert.strictEqual(blocks[0].type, 'o4o/group');
        assert.strictEqual(blocks[0].innerBlocks.length, 1);
        assert.strictEqual(blocks[0].innerBlocks[0].type, 'o4o/paragraph');
    });
});
