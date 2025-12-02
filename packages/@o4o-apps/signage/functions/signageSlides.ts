/**
 * Signage Slides Function Component
 * Displays list of digital signage slides
 */
export const signageSlides = (props: any) => {
  const slides = props.data || [];

  return {
    type: 'SlideCard',
    props: {
      slides: slides.map((slide: any) => ({
        id: slide.id,
        title: slide.title,
        description: slide.description,
        json: slide.json,
        thumbnail: slide.thumbnail,
        duration: slide.duration,
        category: slide.category,
        tags: slide.tags,
        active: slide.active,
        createdAt: slide.createdAt,
        updatedAt: slide.updatedAt,
      })),
    },
  };
};
