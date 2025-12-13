import ProductRating from '../reviews/reviewRating'
import ProductGallery from './productGallery'
import ProductSizes from './productSizes'

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
  ingredients?: string[];
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
  ingredients
}: Props) {

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

          <form action="" method="post">
            {(price != 0) && 
              <div className="d-flex">
                <h3 className="font-weight-normal">${price.toLocaleString()}</h3>
                <input className="opacity-0" defaultValue={price} />
              </div>
            }

            {/* <button className="btn btn-dark btn-lg" type="submit">Add to cart</button> */}
          </form>
        </div>
      </div>
      
      <div className="row mt-5">
        <div className="col-12 col-lg-6">
          <h4>Product Description</h4>
          {full_description && (
            <p>{full_description}</p>
          )}
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
