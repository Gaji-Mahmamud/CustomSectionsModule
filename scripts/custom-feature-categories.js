/**
 * Custom Feature Categories
 * A module that allows creating custom feature categories on character sheets
 */

const MODULE_ID = "custom-feature-categories";

// Initialize the module
Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing Custom Feature Categories module`);
});

// Add the category field to item sheets 
Hooks.on("renderItemSheet", (app, html, data) => {
  try {
    // Only for features
    if (!app.item || app.item.type !== 'feat') return;
    
    console.log(`${MODULE_ID} | Processing feat item sheet:`, app.item.name);
    
    // Use setTimeout to ensure the DOM is fully rendered
    setTimeout(() => {
      try {
        // Get current category value
        const currentCategory = app.item.getFlag(MODULE_ID, 'category') || '';
        console.log(`${MODULE_ID} | Current category:`, currentCategory);
        
        // Create the category input field
        const categoryField = document.createElement('div');
        categoryField.classList.add('form-group');
        categoryField.innerHTML = `
          <label>Category</label>
          <div class="form-fields">
            <input 
              type="text" 
              name="flags.${MODULE_ID}.category" 
              value="${currentCategory}"
              data-dtype="String">
          </div>
        `;
        
        // Multiple strategies for finding where to insert our field
        let inserted = false;
        
        // Debug info about the HTML structure
        console.log(`${MODULE_ID} | Sheet HTML structure:`, html[0]);
        
        // Strategy 1: Find the FEATURE DETAILS header and insert after it
        const featureDetailsHeader = Array.from(html[0].querySelectorAll('h3, .form-header')).find(el => 
          el.textContent?.trim().toUpperCase().includes('FEATURE DETAILS')
        );
        
        if (featureDetailsHeader) {
          console.log(`${MODULE_ID} | Found feature details header, inserting after`);
          featureDetailsHeader.insertAdjacentElement('afterend', categoryField);
          inserted = true;
        } 
        
        // Strategy 2: Find the details tab
        else {
          const detailsTab = html[0].querySelector('.tab[data-tab="details"]');
          if (detailsTab) {
            console.log(`${MODULE_ID} | Found details tab, inserting at top`);
            const firstFormGroup = detailsTab.querySelector('.form-group');
            if (firstFormGroup) {
              firstFormGroup.parentNode.insertBefore(categoryField, firstFormGroup);
            } else {
              detailsTab.appendChild(categoryField);
            }
            inserted = true;
          }
        }
        
        // Strategy 3: Find the Type form group and insert before it
        if (!inserted) {
          const typeLabel = Array.from(html[0].querySelectorAll('label')).find(el => 
            el.textContent?.trim() === 'Type'
          );
          
          if (typeLabel) {
            console.log(`${MODULE_ID} | Found Type label, inserting before its form group`);
            const typeFormGroup = typeLabel.closest('.form-group');
            if (typeFormGroup) {
              typeFormGroup.parentNode.insertBefore(categoryField, typeFormGroup);
              inserted = true;
            }
          }
        }
        
        // Strategy 4: Insert at start of any form
        if (!inserted) {
          const form = html[0].querySelector('form');
          if (form) {
            console.log(`${MODULE_ID} | Inserting at beginning of form`);
            const firstChild = form.firstChild;
            if (firstChild) {
              form.insertBefore(categoryField, firstChild);
            } else {
              form.appendChild(categoryField);
            }
            inserted = true;
          }
        }
        
        // Bind the input to save when changed
        if (inserted) {
          const input = categoryField.querySelector('input');
          input.addEventListener('change', async (ev) => {
            const newValue = ev.target.value.trim();
            console.log(`${MODULE_ID} | Setting category flag to:`, newValue);
            await app.item.setFlag(MODULE_ID, 'category', newValue);
          });
        } else {
          console.error(`${MODULE_ID} | Could not insert category field on item sheet`);
        }
      } catch (error) {
        console.error(`${MODULE_ID} | Error in renderItemSheet delayed processing:`, error);
      }
    }, 100); // Small delay to ensure DOM is ready
  } catch (error) {
    console.error(`${MODULE_ID} | Error in renderItemSheet hook:`, error);
  }
});

// Organize features on the character sheet
Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
  try {
    console.log(`${MODULE_ID} | Processing character sheet:`, app.actor.name);
    
    // Find the features tab - different sheets might have different structures
    let featuresTab = null;
    
    // Try multiple strategies to find the features tab
    const possibleSelectors = [
      '.tab.features', 
      '.tab[data-tab="features"]', 
      '.features-list',
      '.features',
      '[data-tab="features"]'
    ];
    
    for (const selector of possibleSelectors) {
      featuresTab = html[0].querySelector(selector);
      if (featuresTab) {
        console.log(`${MODULE_ID} | Found features tab with selector:`, selector);
        break;
      }
    }
    
    if (!featuresTab) {
      console.log(`${MODULE_ID} | Features tab not found on character sheet`);
      return;
    }
    
    // Get all features with categories
    const features = app.actor.items.filter(i => i.type === 'feat');
    const categorizedFeatures = features.filter(f => f.getFlag(MODULE_ID, 'category'));
    
    // If no categorized features, nothing to do
    if (categorizedFeatures.length === 0) {
      console.log(`${MODULE_ID} | No categorized features found`);
      return;
    }
    
    // Group features by category
    const categories = {};
    for (const feature of categorizedFeatures) {
      const category = feature.getFlag(MODULE_ID, 'category');
      if (!categories[category]) categories[category] = [];
      categories[category].push(feature);
    }
    
    console.log(`${MODULE_ID} | Categorized features:`, categories);
    
    // Create HTML for custom categories
    const customCategoriesContainer = document.createElement('div');
    customCategoriesContainer.classList.add('custom-categories-container');
    
    // Add each category section
    for (const [category, categoryFeatures] of Object.entries(categories)) {
      // Skip empty categories
      if (categoryFeatures.length === 0) continue;
      
      const section = buildCategorySection(category, categoryFeatures, app);
      customCategoriesContainer.appendChild(section);
    }
    
    // Find where to insert the custom categories
    const existingSections = featuresTab.querySelectorAll(
      'section.features-group, .item-list, .inventory-list, .features-list'
    );
    
    if (existingSections.length > 0) {
      console.log(`${MODULE_ID} | Inserting custom categories before existing section`);
      existingSections[0].parentNode.insertBefore(customCategoriesContainer, existingSections[0]);
    } else {
      console.log(`${MODULE_ID} | Appending custom categories to features tab`);
      featuresTab.appendChild(customCategoriesContainer);
    }
    
    // Remove categorized features from default lists to avoid duplication
    for (const feature of categorizedFeatures) {
      const featureEl = html[0].querySelector(`.item[data-item-id="${feature.id}"]`);
      if (featureEl) {
        console.log(`${MODULE_ID} | Removing original feature element:`, feature.name);
        featureEl.remove();
      }
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Error in renderActorSheet5eCharacter hook:`, error);
  }
});

/**
 * Build a category section with all its features
 */
function buildCategorySection(category, features, app) {
  try {
    const section = document.createElement('section');
    section.classList.add('features-group', 'custom-category');
    section.dataset.customCategory = category;
    
    // Create header
    const header = document.createElement('header');
    header.classList.add('items-header');
    header.innerHTML = `
      <h3 class="item-name">${category}</h3>
      <div class="item-controls">
        <a class="item-control item-create" title="Create Item" data-category="${category}">
          <i class="fas fa-plus"></i> Add
        </a>
      </div>
    `;
    section.appendChild(header);
    
    // Create items list
    const ol = document.createElement('ol');
    ol.classList.add('items-list');
    section.appendChild(ol);
    
    // Add each feature
    for (const feature of features) {
      const li = buildFeatureElement(feature, app);
      ol.appendChild(li);
    }
    
    // Add event listener for the create button
    header.querySelector('.item-create').addEventListener('click', ev => {
      ev.preventDefault();
      const categoryName = ev.currentTarget.dataset.category;
      
      console.log(`${MODULE_ID} | Creating new feature with category:`, categoryName);
      
      // Create new item with this category
      const itemData = {
        name: `New ${categoryName} Feature`,
        type: 'feat'
      };
      
      app.actor.createEmbeddedDocuments('Item', [itemData]).then(items => {
        if (items.length > 0) {
          const item = items[0];
          item.setFlag(MODULE_ID, 'category', categoryName);
        }
      });
    });
    
    return section;
  } catch (error) {
    console.error(`${MODULE_ID} | Error building category section:`, error);
    return document.createElement('div'); // Return empty div on error
  }
}

/**
 * Build a feature list item
 */
function buildFeatureElement(feature, app) {
  try {
    const li = document.createElement('li');
    li.classList.add('item');
    li.dataset.itemId = feature.id;
    
    // Get usage data
    const uses = feature.system.uses || {};
    const useValue = uses.value ?? "";
    const useMax = uses.max ?? "";
    const useRecovery = uses.per ? CONFIG.DND5E.limitedUsePeriods[uses.per] : "";
    
    li.innerHTML = `
      <div class="item-name rollable">
        <div class="item-image">
          <img src="${feature.img}" alt="${feature.name}" />
        </div>
        <h4>${feature.name}</h4>
      </div>
      <div class="item-uses">
        ${useValue} ${useMax ? `/ ${useMax}` : ""}
      </div>
      <div class="item-recovery">
        ${useRecovery}
      </div>
      <div class="item-controls">
        <a class="item-control item-edit" title="Edit Item"><i class="fas fa-edit"></i></a>
        <a class="item-control item-delete" title="Delete Item"><i class="fas fa-trash"></i></a>
      </div>
    `;
    
    // Add event listeners
    li.querySelector('.item-name.rollable').addEventListener('click', () => {
      feature.roll();
    });
    
    li.querySelector('.item-edit').addEventListener('click', () => {
      feature.sheet.render(true);
    });
    
    li.querySelector('.item-delete').addEventListener('click', () => {
      feature.delete();
    });
    
    return li;
  } catch (error) {
    console.error(`${MODULE_ID} | Error building feature element for ${feature.name}:`, error);
    return document.createElement('li'); // Return empty li on error
  }
}

// Initialize the module
Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | Ready`);
});
