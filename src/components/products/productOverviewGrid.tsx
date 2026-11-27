import ProductRating from '../reviews/reviewRating'
import ProductGallery from './productGallery'
import ProductSizes from './productSizes'
import AddToCart, { type Variant } from '../cart/addToCart'

interface Props {
  title: string;
  colors: string[];
  images: ({
    src: string;
    alt: string;
  })[];
  full_description: string;
  price: number;
  highlights: string[];
  details: string;
  rating: number;
  reviews: number;
  sizes: Map<string,number>;
  versions?: string[];
  ingredients?: string[];
  square_link?: string;
  square_variation_id?: string;
  variants?: Variant[];
  thumb?: string;
  href?: string;
}

export default function ProductOverview({
  title,
  colors,
  images,
  full_description,
  price,
  highlights,
  details,
  rating,
  reviews,
  sizes,
  versions,
  ingredients,
  square_link,
  square_variation_id,
  variants,
  thumb,
  href
}: Props) {

  // Cart checkout needs a Square catalog variation ID. Until one is set for a
  // product, fall back to its single-item Square payment link.
  const canCart = Boolean(square_variation_id) || Boolean(variants?.some(v => v.square_variation_id));

  // Helper function to parse markdown-style links in ingredient strings
  const parseIngredient = (ingredient: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(ingredient)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(ingredient.substring(lastIndex, match.index));
      }
      // Add the link
      parts.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-primary">
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text after the last link
    if (lastIndex < ingredient.length) {
      parts.push(ingredient.substring(lastIndex));
    }
    return parts.length > 0 ? parts : ingredient;
  };

  return (
    <>
    <div className="card card-product card-plain">
      <div className="row">
        {(images.length != 0) && 
          <ProductGallery images={images}/>
        }
        <div className="col-12 col-lg-6 ps-lg-5">
          {(title.length != 0) && 
            <h2 className="mt-4">{title}</h2>
          }
          {(details.length != 0) && 
            <p className="mb-5">{details}</p>
          }

          {canCart ? (
            <AddToCart
              title={title}
              price={price}
              thumb={thumb ?? images[0]?.src}
              href={href}
              square_variation_id={square_variation_id}
              variants={variants}
            />
          ) : (
            <>
              {(price != 0) && 
                <div className="d-flex mb-4">
                  <h3 className="font-weight-normal">${price.toLocaleString()}</h3>
                </div>
              }

              {square_link && square_link.trim() !== '' && (
                <div className="mt-4 mb-4">
                  <a 
                    href={square_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-lg w-100 w-md-auto"
                    style={{ 
                      minWidth: '200px',
                      display: 'inline-block',
                      textAlign: 'center'
                    }}
                  >
                    Buy Now
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="row mt-5">
        <div className="col-12 col-lg-6">
          <h4>Product Description</h4>
          {full_description && full_description.split(/\n+/).filter(para => para.trim() !== '').map((para, index) => (
            <p key={index}>{para}</p>
          ))}
          {(highlights.length != 0) && 
           <>
             <h6>Benefits</h6>
              <ul className="text-sm">
              {highlights.map(highlight => 
                <li className="mb-2">{highlight}</li>
              )}
              </ul>
           </>
          }
          {(versions && versions.length > 0) &&
            <>
              <h6 className="mt-4">Versions &amp; Sizing</h6>
              <ul className="text-sm">
                {versions.map((version, index) => (
                  <li key={index} className="mb-2">{version}</li>
                ))}
              </ul>
            </>
          }
          {(ingredients && ingredients.length > 0) &&
            <>
              <h6 className="mt-4">Ingredients</h6>
              <ul className="text-sm">
                {ingredients.map((ingredient, index) => (
                  <li key={index} className="mb-2">
                    {parseIngredient(ingredient)}
                  </li>
                ))}
              </ul>
            </>
          }
        </div>
      </div>
    </div>
    </>
  );
};
