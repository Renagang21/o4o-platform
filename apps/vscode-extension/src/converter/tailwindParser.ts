export function parseTailwindClasses(className: string): Record<string, any> {
    const classes = className.split(/\s+/);
    const attributes: Record<string, any> = {};

    for (const cls of classes) {
        // Text Size
        if (cls.startsWith('text-')) {
            const size = cls.replace('text-', '');
            if (size === 'sm') attributes.fontSize = 14;
            else if (size === 'base') attributes.fontSize = 16;
            else if (size === 'lg') attributes.fontSize = 18;
            else if (size === 'xl') attributes.fontSize = 20;
            else if (size === '2xl') attributes.fontSize = 24;
            else if (size === '3xl') attributes.fontSize = 30;
            else if (size === '4xl') attributes.fontSize = 36;
            // Add more sizes as needed
        }

        // Text Color (Simplified mapping)
        if (cls.startsWith('text-') && !cls.match(/text-(sm|base|lg|xl|\d+xl)/)) {
            // This is a very basic mapping. In a real scenario, we'd need a full palette map.
            // For now, we'll just pass the class or try to map basic colors if needed.
            // But O4O expects hex codes usually.
            // Let's assume we map some basics or leave it for the user to refine if complex.
            if (cls === 'text-white') attributes.textColor = '#ffffff';
            else if (cls === 'text-black') attributes.textColor = '#000000';
            else if (cls.includes('gray')) attributes.textColor = '#1f2937'; // gray-800 approximation
            else if (cls.includes('blue')) attributes.textColor = '#2563eb'; // blue-600 approximation
        }

        // Background Color
        if (cls.startsWith('bg-')) {
            if (cls === 'bg-white') attributes.backgroundColor = '#ffffff';
            else if (cls === 'bg-black') attributes.backgroundColor = '#000000';
            else if (cls.includes('gray')) attributes.backgroundColor = '#f3f4f6'; // gray-100
            else if (cls.includes('blue')) attributes.backgroundColor = '#3b82f6'; // blue-500
        }

        // Alignment
        if (cls === 'text-left') attributes.align = 'left';
        if (cls === 'text-center') attributes.align = 'center';
        if (cls === 'text-right') attributes.align = 'right';

        // Spacing (Padding/Margin) - Simplified
        // O4O might expect specific spacing objects or just use these for layout blocks
        if (cls.startsWith('p-')) {
            const val = parseInt(cls.replace('p-', '')) * 4;
            if (!isNaN(val)) attributes.padding = val;
        }

        // Grid/Flex (for layout detection, though usually handled at block level)
    }

    return attributes;
}
