import ProductBadge from './productBadge';

interface Props {
  thumb_src: string;
  thumb_alt: string;
  title: string;
  description: string;
  price: number;
  color: string;
  colors: string[];
  position: string;
  productId?: string;
}

export default function CardProduct({
  thumb_src,
  thumb_alt,
  title,
  description,
  price,
  color,
  colors,
  position,
  productId
}: Props) {

  const classList = "card-body " + "text-" + position;
  const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
    ? import.meta.env.BASE_URL 
    : import.meta.env.BASE_URL + '/';
  const productLink = productId ? `${baseUrl}products/${productId}/` : '#';
  // Handle image path - if image path starts with /, use it as-is (absolute path)
  // Otherwise, prepend BASE_URL
  const imageSrc = thumb_src.startsWith('/') 
    ? thumb_src
    : `${import.meta.env.BASE_URL}${thumb_src}`;

  return (
    <>
      <div className="card card-product border mb-5 shadow-xs border-radius-lg">
        <a href={productLink}>
          <div className="height-350">
            <img className="w-100 h-100 p-4 rounded-top" src={imageSrc} alt={thumb_alt} />
          </div>
          <div className={classList}>
            {(color) && 
              <h6 className="text-md mb-1 text-body">{color}</h6>
            }
            {(title) && 
              <h4 className="font-weight-bold">
                {title}
              </h4>
            }

            {(description) && 
              <p className="text-body">{description}</p>
            }
           
            {(colors) &&
              <ProductBadge colors={colors} />
            }
            
            {(price) && 
              <h4 className="mb-0 text-lg mt-1 mb-3">
                ${price.toLocaleString()}
              </h4>
            }

            {!(description || colors || color) &&
              <a href={productLink} className="font-weight-normal text-body text-sm">Shop Now</a>
            }
          </div>
        </a>
      </div>
    </>
  );
};
