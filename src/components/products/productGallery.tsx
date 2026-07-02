import { useState } from 'react';

interface Props {
  images: ({
    src: string;
    alt: string;
  })[];
}

export default function ProductGallery({
  images,
}: Props) {
  // Which thumbnail is shown as the large/hero image. Requires the component to
  // be hydrated (e.g. client:load on the parent) for clicks to take effect.
  const [selected, setSelected] = useState(0);

  // Helper function to handle image paths
  // Images from public folder - use absolute paths as-is
  // If path starts with /, it's already absolute from root
  const baseUrl = (import.meta.env.BASE_URL || '/').endsWith('/')
    ? (import.meta.env.BASE_URL || '/')
    : (import.meta.env.BASE_URL || '/') + '/';
  const getImageSrc = (src: string) => {
    return src.startsWith('/') ? src : `${baseUrl}${src}`;
  };

  const activeImage = images[selected] ?? images[0];

  return (
    <>
      <div className="col-12 col-lg-6 d-flex">
        <div className="d-block">
          {images.map((image, index) => (
            <img
              key={index}
              className={`w-90 max-height-150 rounded-2${index < images.length - 1 ? ' mb-4' : ''}`}
              src={getImageSrc(image.src)}
              alt={image.alt}
              onClick={() => setSelected(index)}
              aria-label={`Show ${image.alt}`}
              style={{
                cursor: 'pointer',
                opacity: index === selected ? 1 : 0.6,
                border: index === selected ? '2px solid #344767' : '2px solid transparent',
              }}
            />
          ))}
        </div>
        <img className="w-70 rounded-2" src={getImageSrc(activeImage.src)} alt={activeImage.alt} />
      </div>
    </>
  );
}
