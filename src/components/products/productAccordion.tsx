interface Props {
  data: Map<string,string | string[]>
}

export default function ProductAccordion({
  data
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

  const accordion: JSX.Element[] = [];
  let i = 0;

  Object.entries(data).map(([title,value],i) => {
    // Check if value is an array (for Ingredients)
    const isArray = Array.isArray(value);
    const bodyContent = isArray ? (
      <ul className="text-sm mb-0">
        {(value as string[]).map((item, index) => (
          <li key={index} className="mb-2">
            {parseIngredient(item)}
          </li>
        ))}
      </ul>
    ) : (
      value as string
    );

    if (i != 0) {
      accordion.push(
        <div className="accordion-item" key={i}>
          <h5 className="accordion-header" id={"heading" + i}>
            <button className="accordion-button border-bottom font-weight-bold py-4" type="button" data-bs-toggle="collapse" data-bs-target={"#collapse" + i} aria-expanded="false" aria-controls={"collapse" + i}>
              {title}
              <i className="collapse-close fa fa-plus text-xs pt-1 position-absolute end-0 me-3" aria-hidden="true"></i>
              <i className="collapse-open fa fa-minus text-xs pt-1 position-absolute end-0 me-3" aria-hidden="true"></i>
            </button>
          </h5>
          <div id={"collapse" + i} className="accordion-collapse collapse" aria-labelledby={"heading" + i} data-bs-parent="#accordionEcommerce">
            <div className="accordion-body text-body text-sm opacity-8">
              {bodyContent}
            </div>
          </div>
        </div>
      )
    } else {
      accordion.push(
        <div className="accordion-item" key={i}>
          <h5 className="accordion-header" id={"heading" + i}>
            <button className="accordion-button border-bottom font-weight-bold collapsed py-4" type="button" data-bs-toggle="collapse" data-bs-target={"#collapse" + i} aria-expanded="true" aria-controls={"collapse" + i}>
              {title}
              <i className="collapse-close fa fa-plus text-xs pt-1 position-absolute end-0 me-3" aria-hidden="true"></i>
              <i className="collapse-open fa fa-minus text-xs pt-1 position-absolute end-0 me-3" aria-hidden="true"></i>
            </button>
          </h5>
          <div id={"collapse" + i} className="accordion-collapse collapse show" aria-labelledby={"heading" + i} data-bs-parent="#accordionEcommerce">
            <div className="accordion-body text-body text-sm opacity-8">
              {bodyContent}
            </div>
          </div>
        </div>
      )
    }
  })

  return (
    <>
      <div className="accordion mt-5" id="accordionEcommerce">
        {accordion}
      </div>
    </>
  );
}





