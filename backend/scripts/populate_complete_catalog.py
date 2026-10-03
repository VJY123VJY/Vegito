import datetime
from decimal import Decimal
import os
import sys

# Ensure UTF-8 console output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.address import Address
from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.role import Role
from app.models.seller_product import SellerProduct
from app.models.seller_profile import SellerProfile
from app.models.user import User

CATEGORIES_DEF = [
    # Top-level Master Categories (kept for backwards-compat)
    {"name": "Vegetables", "description": "All fresh vegetables from local farms", "display_order": 1, "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80"},
    {"name": "Fruits", "description": "Fresh orchard fruits and berries", "display_order": 2, "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80"},
    # Vegetable Sub-categories
    {"name": "Leafy Vegetables", "description": "Fresh tender leafy greens, palak, methi & herbs", "display_order": 3, "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80"},
    {"name": "Root Vegetables", "description": "Earthen-grown onions, potatoes, carrots, radish & beetroot", "display_order": 4, "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80"},
    {"name": "Fruit Vegetables", "description": "Juicy tomatoes, brinjals, capsicum, bhindi & cucumbers", "display_order": 5, "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80"},
    {"name": "Gourds", "description": "Bottle gourd, bitter gourd, ridge gourd, pumpkin & ivy gourd", "display_order": 6, "image_url": "https://images.unsplash.com/photo-1582515073490-39981397c445?w=600&auto=format&fit=crop&q=80"},
    {"name": "Beans & Peas", "description": "Green peas, cluster beans, french beans & flat beans", "display_order": 7, "image_url": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80"},
    {"name": "Cruciferous Vegetables", "description": "Fresh cauliflower, green cabbage, broccoli & red cabbage", "display_order": 8, "image_url": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80"},
    {"name": "Herbs & Fresh Greens", "description": "Pungent garlic, ginger, lemons, chillies & fresh seasonings", "display_order": 9, "image_url": "https://images.unsplash.com/photo-1588879462615-5c1cf78dc3b9?w=600&auto=format&fit=crop&q=80"},
    {"name": "Specialty & Seasonal Vegetables", "description": "Sweet corn, baby corn, fresh mushrooms, zucchini & drumsticks", "display_order": 10, "image_url": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80"},
    # Fruit Sub-categories
    {"name": "Citrus Fruits", "description": "Juicy sweet oranges, mosambi & kinnow", "display_order": 11, "image_url": "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&auto=format&fit=crop&q=80"},
    {"name": "Tropical Fruits", "description": "Naturally ripe bananas, papaya, mango, chikoo, guava & pomegranate", "display_order": 12, "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80"},
    {"name": "Melons", "description": "Crisp sweet watermelons & aromatic golden muskmelons", "display_order": 13, "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80"},
    {"name": "Berries & Stone Fruits", "description": "Fresh strawberries, blueberries, seedless grapes & plums", "display_order": 14, "image_url": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&auto=format&fit=crop&q=80"},
    {"name": "Exotic Fruits", "description": "Royal delicious apples, kiwis, red dragon fruit & sweet pears", "display_order": 15, "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80"},
]

COMPLETE_PRODUCTS = [
    # ==========================================
    # 1. ROOT VEGETABLES
    # ==========================================
    {
        "name": "Fresh Red Onion (गावरान लाल कांदा)",
        "canonical_name": "red onion",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("38.00"),
        "stock": Decimal("300.000"),
        "shelf_life_days": 14,
        "description": "Farm-fresh Solapur mandi red onions. Dry outer skin, firm texture, pungent aroma ideal for gravies and daily cooking.",
        "image_url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "White Onion (पांढरा कांदा)",
        "canonical_name": "white onion",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("42.00"),
        "stock": Decimal("100.000"),
        "shelf_life_days": 12,
        "description": "Mild sweet white onions, excellent for raw salads, sandwiches, and traditional Maharashtra dishes.",
        "image_url": "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sambar Small Shallots (मद्रासी लहान कांदा)",
        "canonical_name": "shallots",
        "category_name": "Root Vegetables",
        "unit": "500 G",
        "price": Decimal("35.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 14,
        "description": "Small pungent pink shallots specially prized for sambar, shallot chutneys, and rich coastal curries.",
        "image_url": "https://images.unsplash.com/photo-1508747703725-719777637510?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Jyoti Potatoes (बटाटा)",
        "canonical_name": "potato",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("32.00"),
        "stock": Decimal("350.000"),
        "shelf_life_days": 15,
        "description": "Starch-rich golden potatoes with smooth thin skin. Perfect for crispy fries, sabzi, batata vada, and roasting.",
        "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Baby Potatoes (दम बटाटा)",
        "canonical_name": "baby potato",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("36.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 15,
        "description": "Uniform small round potatoes ideal for dum aloo curries, roasting, and spiced dry fry.",
        "image_url": "https://images.unsplash.com/photo-1508313880080-c5bef0730395?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Potato / Ratalu (रताळे)",
        "canonical_name": "sweet potato",
        "category_name": "Root Vegetables",
        "unit": "500 G",
        "price": Decimal("30.00"),
        "stock": Decimal("75.000"),
        "shelf_life_days": 12,
        "description": "Naturally sweet earthen tubers with purple-red skin. Delicious boiled, roasted, or prepared for fast/upvas fasting recipes.",
        "image_url": "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Elephant Foot Yam / Suran (सुरण)",
        "canonical_name": "suran yam",
        "category_name": "Root Vegetables",
        "unit": "500 G",
        "price": Decimal("35.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 20,
        "description": "Firm earthy elephant yam. Excellent non-scratchy cooking quality for spicy suran roast and traditional curries.",
        "image_url": "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Sweet Red Carrots (गाजर)",
        "canonical_name": "carrot",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("45.00"),
        "stock": Decimal("130.000"),
        "shelf_life_days": 8,
        "description": "Crisp juicy red carrots, naturally sweet and rich in beta-carotene. Great for salads, juices, and gajar halwa.",
        "image_url": "https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Beetroot (ताजे बीट)",
        "canonical_name": "beetroot",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("40.00"),
        "stock": Decimal("110.000"),
        "shelf_life_days": 10,
        "description": "Deep crimson earthen-grown beetroots with clean earthy flavor. Packed with antioxidants for healthy juices and salads.",
        "image_url": "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "White Radish / Mula (मुळा)",
        "canonical_name": "radish mula",
        "category_name": "Root Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("25.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 6,
        "description": "Crisp pungent white radishes with fresh green leaves attached. Great for mooli parathas, salads, and sambar.",
        "image_url": "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Turnip / Shalgam (शलजम)",
        "canonical_name": "turnip shalgam",
        "category_name": "Root Vegetables",
        "unit": "500 G",
        "price": Decimal("28.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 9,
        "description": "Firm white and purple turnips with crisp flesh and peppery-sweet bite. Perfect for winter stews and pickles.",
        "image_url": "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 2. LEAFY VEGETABLES
    # ==========================================
    {
        "name": "Fresh Spinach / Palak (ताजा पालक)",
        "canonical_name": "spinach palak",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("22.00"),
        "stock": Decimal("140.000"),
        "shelf_life_days": 3,
        "description": "Dark green tender spinach leaves harvested at dawn. Rich in iron and folate for palak paneer and healthy smoothies.",
        "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Desi Fenugreek / Methi (गावरान मेथी)",
        "canonical_name": "fenugreek methi",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("26.00"),
        "stock": Decimal("120.000"),
        "shelf_life_days": 3,
        "description": "Fragrant small-leaf country methi with distinctive earthy bitterness. Ideal for aloo methi and soft methi thepla.",
        "image_url": "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Coriander / Kothimbir (ताजी कोथिंबीर)",
        "canonical_name": "coriander kothimbir",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("20.00"),
        "stock": Decimal("180.000"),
        "shelf_life_days": 4,
        "description": "Aromatic fresh cilantro with vibrant green leaves and tender stems. Enhances every dish as a finishing garnish.",
        "image_url": "https://images.unsplash.com/photo-1588879462615-5c1cf78dc3b9?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Shepu / Dill Leaves (शेपू भाजी)",
        "canonical_name": "dill shepu",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("20.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 3,
        "description": "Pungent feathery dill leaves loved for wholesome digestion. Great cooked with yellow moong dal.",
        "image_url": "https://images.unsplash.com/photo-1615485290176-7c0a6b933d6b?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Red Amaranth / Lal Math (लाल माठ)",
        "canonical_name": "red amaranth lal math",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("22.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 3,
        "description": "Deep red and green amaranth leaves loaded with minerals. Cook with garlic and mild green chillies.",
        "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Mustard Greens / Sarson (मोहरीची पाने)",
        "canonical_name": "mustard greens sarson",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("25.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 4,
        "description": "Crisp peppery mustard greens, traditional staple for slow-cooked Sarson ka Saag with makki ki roti.",
        "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Mint / Pudina (पुदिना)",
        "canonical_name": "mint pudina",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("15.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 4,
        "description": "Crisp aromatic spearmint leaves for cooling chaas, chutney, biryani marinades, and tea infusions.",
        "image_url": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Curry Leaves / Kadi Patta (कढीपत्ता)",
        "canonical_name": "curry leaves",
        "category_name": "Leafy Vegetables",
        "unit": "100 G",
        "price": Decimal("12.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 7,
        "description": "Hand-picked fragrant curry leaves. Releases quintessential tempering aroma in mustard and cumin tadka.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Spring Onion / Kanda Pat (कांदा पात)",
        "canonical_name": "spring onion",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("24.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 4,
        "description": "Tender white scallion bulbs with fresh crisp hollow greens. Adds sweet crunch to Indo-Chinese fried rice and dal.",
        "image_url": "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Drumstick Leaves / Shevga Paan (शेवग्याची पाने)",
        "canonical_name": "moringa drumstick leaves",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("20.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 3,
        "description": "Nutrient-powerhouse moringa leaves rich in vitamin A, calcium, and plant protein. Great in dal and stir fries.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 3. FRUIT VEGETABLES
    # ==========================================
    {
        "name": "Fresh Hybrid Tomatoes (हायब्रिड टोमॅटो)",
        "canonical_name": "hybrid tomato",
        "category_name": "Fruit Vegetables",
        "unit": "1 KG",
        "price": Decimal("38.00"),
        "stock": Decimal("200.000"),
        "shelf_life_days": 7,
        "description": "Plump red hybrid tomatoes with glossy skin and balanced acidity. Perfect for curries, purées, and fresh salads.",
        "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Desi Country Tomatoes (गावरान टोमॅटो)",
        "canonical_name": "country tomato",
        "category_name": "Fruit Vegetables",
        "unit": "1 KG",
        "price": Decimal("42.00"),
        "stock": Decimal("120.000"),
        "shelf_life_days": 5,
        "description": "Tangy aromatic country tomatoes harvested straight from local farms for authentic flavor in Maharashtra dal and curries.",
        "image_url": "https://images.unsplash.com/photo-1546470427-0d4db154ceb7?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Raw Green Tomatoes (हिरवे टोमॅटो)",
        "canonical_name": "green tomato",
        "category_name": "Fruit Vegetables",
        "unit": "500 G",
        "price": Decimal("22.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 8,
        "description": "Firm tangy unripened green tomatoes. Celebrated in Maharashtra for spicy green tomato chutney and dry bhaji.",
        "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Purple Spiny Brinjal / Vangi (काटेरी वांगी)",
        "canonical_name": "purple brinjal",
        "category_name": "Fruit Vegetables",
        "unit": "1 KG",
        "price": Decimal("44.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 6,
        "description": "Tender small purple spiny brinjals famous in Solapur for stuffed Bharli Vangi and traditional coconut peanut gravy.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Round Green Brinjal (हिरवे भरताचे वांगे)",
        "canonical_name": "green brinjal",
        "category_name": "Fruit Vegetables",
        "unit": "1 KG",
        "price": Decimal("40.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 6,
        "description": "Large meaty round green eggplants. Perfect for open-flame roasting to prepare authentic smoked Baingan Bharta.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Tender Okra / Lady Finger (कोवळी भेंडी)",
        "canonical_name": "okra bhindi",
        "category_name": "Fruit Vegetables",
        "unit": "1 KG",
        "price": Decimal("52.00"),
        "stock": Decimal("100.000"),
        "shelf_life_days": 5,
        "description": "Small, tender snap-fresh okra pods with minimal seeds. Cooks up crisp and non-slimy in bhindi masala and fry.",
        "image_url": "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Green Capsicum / Shimla Mirchi (ढोबळी मिरची)",
        "canonical_name": "green capsicum",
        "category_name": "Fruit Vegetables",
        "unit": "1 KG",
        "price": Decimal("60.00"),
        "stock": Decimal("85.000"),
        "shelf_life_days": 7,
        "description": "Glossy bell peppers with thick walls and crunchy bite. Excellent for pizza, stir fry, and paneer tikka skewers.",
        "image_url": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Red Bell Pepper (लाल ढोबळी मिरची)",
        "canonical_name": "red bell pepper",
        "category_name": "Fruit Vegetables",
        "unit": "1 Piece",
        "price": Decimal("35.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 6,
        "description": "Sweet ripe red bell pepper loaded with antioxidants. Crisp sweet bite for pasta, fajitas, and fresh salads.",
        "image_url": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Yellow Bell Pepper (पिवळी ढोबळी मिरची)",
        "canonical_name": "yellow bell pepper",
        "category_name": "Fruit Vegetables",
        "unit": "1 Piece",
        "price": Decimal("35.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 6,
        "description": "Bright golden yellow bell pepper with delicate sweet flavor. Perfect complement to grilled vegetables and salads.",
        "image_url": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Spicy Green Chillies (तिखट हिरवी मिरची)",
        "canonical_name": "green chillies",
        "category_name": "Fruit Vegetables",
        "unit": "250 G",
        "price": Decimal("18.00"),
        "stock": Decimal("100.000"),
        "shelf_life_days": 10,
        "description": "Slender fiery green chillies from regional farms. Adds sharp heat and punch to Maharashtrian thecha and curries.",
        "image_url": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Dark Green Bhavnagri Mirchi (मोठी मिरची)",
        "canonical_name": "bhavnagri chilli",
        "category_name": "Fruit Vegetables",
        "unit": "250 G",
        "price": Decimal("20.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 8,
        "description": "Mild, thick-fleshed long chillies with gentle warmth. Made famous in crispy Mirchi Bhajji and stuffed pickle recipes.",
        "image_url": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Crispy Green Cucumber (काकडी)",
        "canonical_name": "cucumber kakdi",
        "category_name": "Fruit Vegetables",
        "unit": "1 KG",
        "price": Decimal("34.00"),
        "stock": Decimal("110.000"),
        "shelf_life_days": 6,
        "description": "Cool hydrating salad cucumbers with tender skin and refreshing crunch. Best for raita, koshimbir, and morning snacks.",
        "image_url": "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 4. GOURDS
    # ==========================================
    {
        "name": "Green Bottle Gourd / Dudhi (दुधी भोपळा)",
        "canonical_name": "bottle gourd dudhi",
        "category_name": "Gourds",
        "unit": "1 Piece",
        "price": Decimal("32.00"),
        "stock": Decimal("65.000"),
        "shelf_life_days": 7,
        "description": "Hydrating light green bottle gourd with tender white flesh. Perfect for light evening soups, lauki kofta, and halwa.",
        "image_url": "https://images.unsplash.com/photo-1582515073490-39981397c445?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Crisp Bitter Gourd / Karela (कारले)",
        "canonical_name": "bitter gourd karela",
        "category_name": "Gourds",
        "unit": "1 KG",
        "price": Decimal("52.00"),
        "stock": Decimal("55.000"),
        "shelf_life_days": 7,
        "description": "Dark green ridged bitter gourds rich in nutrients and blood-purifying properties. Great for stuffed bharwa karela.",
        "image_url": "https://images.unsplash.com/photo-1615485290176-7c0a6b933d6b?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Ridge Gourd / Dodka (दोडका)",
        "canonical_name": "ridge gourd dodka",
        "category_name": "Gourds",
        "unit": "1 KG",
        "price": Decimal("56.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 6,
        "description": "Tender fresh ridged gourds with soft pulp. Easy on digestion, ideal for quick homestyle stir-fries and dals.",
        "image_url": "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sponge Gourd / Ghosale (घोसाळे)",
        "canonical_name": "sponge gourd ghosale",
        "category_name": "Gourds",
        "unit": "500 G",
        "price": Decimal("28.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 5,
        "description": "Smooth skinned delicate sponge gourd with gentle cooling nature. Cook with soaked yellow lentils for a comforting lunch.",
        "image_url": "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Snake Gourd / Padwal (पडवळ)",
        "canonical_name": "snake gourd padwal",
        "category_name": "Gourds",
        "unit": "1 Piece",
        "price": Decimal("28.00"),
        "stock": Decimal("35.000"),
        "shelf_life_days": 6,
        "description": "Long striped tender snake gourd. Excellent fiber-rich vegetable for coconut kootu and stir-fry sabzi.",
        "image_url": "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Ivy Gourd / Tondli (तोंडली)",
        "canonical_name": "ivy gourd tondli",
        "category_name": "Gourds",
        "unit": "500 G",
        "price": Decimal("30.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 7,
        "description": "Small crisp green tindora/tondli. When sautéed with mustard seeds and grated coconut, gives a delightfully crunchy side.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Ash Gourd / Petha Kohla (पेठा कोहळा)",
        "canonical_name": "ash gourd kohla",
        "category_name": "Gourds",
        "unit": "1 KG",
        "price": Decimal("32.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 12,
        "description": "Large white-fleshed wax gourd famous for morning detox juice, cooling Mor Kuzhambu, and sweet Agra petha.",
        "image_url": "https://images.unsplash.com/photo-1582515073490-39981397c445?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Yellow Pumpkin (लाल भोपळा)",
        "canonical_name": "yellow pumpkin bhopla",
        "category_name": "Gourds",
        "unit": "1 KG",
        "price": Decimal("30.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 14,
        "description": "Rich golden sweet pumpkin cut from heavy fresh harvest. High in beta carotene, ideal for pumpkin soup and sweet puri.",
        "image_url": "https://images.unsplash.com/photo-1506917728037-b6af01a7d403?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 5. BEANS & PEAS
    # ==========================================
    {
        "name": "Sweet Green Peas / Matar (ताजा मटार)",
        "canonical_name": "green peas matar",
        "category_name": "Beans & Peas",
        "unit": "1 KG",
        "price": Decimal("78.00"),
        "stock": Decimal("95.000"),
        "shelf_life_days": 6,
        "description": "Full pods loaded with naturally sweet green pearls. Ideal for matar paneer, pulao, aloo matar, and parathas.",
        "image_url": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Cluster Beans / Gawar (ताजी गवार)",
        "canonical_name": "cluster beans gawar",
        "category_name": "Beans & Peas",
        "unit": "1 KG",
        "price": Decimal("62.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 5,
        "description": "Tender young gawar beans free of tough fiber. Delicious when prepared with roasted peanut powder and garlic.",
        "image_url": "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "French Beans / Farasbi (फरसबी)",
        "canonical_name": "french beans farasbi",
        "category_name": "Beans & Peas",
        "unit": "1 KG",
        "price": Decimal("65.00"),
        "stock": Decimal("55.000"),
        "shelf_life_days": 6,
        "description": "Slender stringless green beans rich in dietary fiber. Snaps crisp for poriyal, fried rice, and vegetable pulao.",
        "image_url": "https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Flat Beans / Walor Papdi (वाल पापडी)",
        "canonical_name": "flat beans papdi",
        "category_name": "Beans & Peas",
        "unit": "500 G",
        "price": Decimal("35.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 5,
        "description": "Broad tender green flat pods prized in Undhiyu and winter Maharashtrian usal recipes.",
        "image_url": "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Cowpea Long Beans / Chawli Shing (चवळी शेंगा)",
        "canonical_name": "chawli long beans",
        "category_name": "Beans & Peas",
        "unit": "500 G",
        "price": Decimal("30.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 5,
        "description": "Slender tender yardlong cowpea pods. Excellent chopped fine and stir fried with shredded coconut.",
        "image_url": "https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Green Chana / Harbhara (ओला हरभरा)",
        "canonical_name": "green chana harbhara",
        "category_name": "Beans & Peas",
        "unit": "500 G",
        "price": Decimal("40.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 4,
        "description": "Fresh seasonal raw green chickpeas in pods. Sweet earthy flavor enjoyed steamed or roasted over coals.",
        "image_url": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 6. CRUCIFEROUS VEGETABLES
    # ==========================================
    {
        "name": "Fresh Cauliflower (फ्लॉवर)",
        "canonical_name": "cauliflower",
        "category_name": "Cruciferous Vegetables",
        "unit": "1 Piece",
        "price": Decimal("40.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 6,
        "description": "Compact white curd surrounded by protective crisp green leaves. Clean and pesticide-free, great for aloo gobi.",
        "image_url": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Green Cabbage (हिरवा कोबी)",
        "canonical_name": "cabbage",
        "category_name": "Cruciferous Vegetables",
        "unit": "1 KG",
        "price": Decimal("32.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 10,
        "description": "Tight, crunchy layered green cabbage heads. Retains crispness in stir-fries, rolls, salads, and vegetable noodles.",
        "image_url": "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Purple Cabbage (जांभळा कोबी)",
        "canonical_name": "purple cabbage",
        "category_name": "Cruciferous Vegetables",
        "unit": "500 G",
        "price": Decimal("35.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 12,
        "description": "Vibrant violet crunch cabbage loaded with anthocyanins. Gorgeous addition to coleslaw, tacos, and fresh bowls.",
        "image_url": "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Green Broccoli (ब्रोकोली)",
        "canonical_name": "broccoli",
        "category_name": "Cruciferous Vegetables",
        "unit": "1 Piece",
        "price": Decimal("55.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 5,
        "description": "Dense emerald green crowns rich in sulforaphane, fiber, and vitamin C. Lightly steam or stir-fry with garlic olive oil.",
        "image_url": "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 7. HERBS & FRESH GREENS
    # ==========================================
    {
        "name": "Desi Garlic / Lasun (गावरान लसूण)",
        "canonical_name": "garlic lasun",
        "category_name": "Herbs & Fresh Greens",
        "unit": "250 G",
        "price": Decimal("48.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 30,
        "description": "Aromatic small-clove country garlic with intense flavor oils. Essential for garlic chutneys and tadka.",
        "image_url": "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Ginger / Aale (ताजे आले)",
        "canonical_name": "ginger aale",
        "category_name": "Herbs & Fresh Greens",
        "unit": "250 G",
        "price": Decimal("32.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 14,
        "description": "Juicy unbleached fresh ginger rhizomes packed with warm spice and digestive warmth for chai and marinades.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Juicy Yellow Lemons (रसरशीत लिंबू)",
        "canonical_name": "lemon limbu",
        "category_name": "Herbs & Fresh Greens",
        "unit": "4 Pieces",
        "price": Decimal("18.00"),
        "stock": Decimal("130.000"),
        "shelf_life_days": 10,
        "description": "Thin-skinned citrus lemons brimming with vitamin-C rich juice. Perfect for nimbu pani, garnishing, and marinades.",
        "image_url": "https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Celery (सेलरी)",
        "canonical_name": "celery",
        "category_name": "Herbs & Fresh Greens",
        "unit": "250 G",
        "price": Decimal("35.00"),
        "stock": Decimal("30.000"),
        "shelf_life_days": 7,
        "description": "Crisp aromatic green celery stalks. Adds herbal depth to vegetable broths, detox juices, and stir fries.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Aromatic Lemongrass (गवती चहा)",
        "canonical_name": "lemongrass",
        "category_name": "Herbs & Fresh Greens",
        "unit": "1 Bunch",
        "price": Decimal("15.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 8,
        "description": "Refreshing citrus-aroma tea grass. Brews restorative herbal tea and brings authentic aroma to soups.",
        "image_url": "https://images.unsplash.com/photo-1588879462615-5c1cf78dc3b9?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 8. SPECIALTY & SEASONAL VEGETABLES
    # ==========================================
    {
        "name": "Fresh Drumstick / Shevga (शेवगा शेंगा)",
        "canonical_name": "drumstick shevga",
        "category_name": "Specialty & Seasonal Vegetables",
        "unit": "500 G",
        "price": Decimal("40.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 6,
        "description": "Fleshy drumsticks with rich aromatic pulp. Essential for authentic South Indian sambar and Maharashtrian curries.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Corn Cob (अमेरिकन मका)",
        "canonical_name": "sweet corn",
        "category_name": "Specialty & Seasonal Vegetables",
        "unit": "2 Pieces",
        "price": Decimal("35.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 5,
        "description": "Sweet golden kernels tightly packed on fresh cobs with green husks intact. Boil, steam, or roast with lime and butter.",
        "image_url": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Tender Baby Corn (बेबी कॉर्न)",
        "canonical_name": "baby corn",
        "category_name": "Specialty & Seasonal Vegetables",
        "unit": "200 G",
        "price": Decimal("35.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 5,
        "description": "Tender miniature sweet corn spears. Crunchy addition to baby corn manchurian, pizzas, and vegetable stir fry.",
        "image_url": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "White Button Mushrooms (मशरूम)",
        "canonical_name": "button mushrooms",
        "category_name": "Specialty & Seasonal Vegetables",
        "unit": "200 G",
        "price": Decimal("48.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 4,
        "description": "Clean, plump button mushrooms with earthy savory umami. Sauté with butter and pepper or cook in creamy curries.",
        "image_url": "https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Green Zucchini (हिरवी झुकिनी)",
        "canonical_name": "zucchini",
        "category_name": "Specialty & Seasonal Vegetables",
        "unit": "1 Piece",
        "price": Decimal("35.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 6,
        "description": "Tender summer squash with soft edible skin. Low calorie vegetable ideal for pastas, grilling, and baked dishes.",
        "image_url": "https://images.unsplash.com/photo-1582515073490-39981397c445?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Raw Cooking Banana (कच्चे केळी)",
        "canonical_name": "raw banana",
        "category_name": "Specialty & Seasonal Vegetables",
        "unit": "500 G",
        "price": Decimal("25.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 7,
        "description": "Firm green unripened plantains. High in resistant starch, ideal for spicy kache kele ki sabzi and crispy banana chips.",
        "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Raw Green Papaya (कच्ची पपई)",
        "canonical_name": "raw papaya",
        "category_name": "Specialty & Seasonal Vegetables",
        "unit": "1 Piece",
        "price": Decimal("35.00"),
        "stock": Decimal("35.000"),
        "shelf_life_days": 8,
        "description": "Crisp green raw papaya. Grated for authentic Maharashtrian sambharo relish, salads, and gut-healthy curries.",
        "image_url": "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 9. CITRUS FRUITS
    # ==========================================
    {
        "name": "Sweet Oranges / Santra (नागपूर संत्री)",
        "canonical_name": "orange santra",
        "category_name": "Citrus Fruits",
        "unit": "1 KG",
        "price": Decimal("85.00"),
        "stock": Decimal("75.000"),
        "shelf_life_days": 8,
        "description": "Juicy sweet-tart seasonal oranges bursting with pulpy citrus juice. Refreshing and vitamin-rich.",
        "image_url": "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Mosambi / Sweet Lime (गोड मोसंबी)",
        "canonical_name": "sweet lime mosambi",
        "category_name": "Citrus Fruits",
        "unit": "1 KG",
        "price": Decimal("80.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 8,
        "description": "Mild sweet lime with zero bitterness and soothing sweetness. Rejuvenating fresh juice for wellness and hydration.",
        "image_url": "https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Kinnow Mandarin (रसरशीत किन्नू)",
        "canonical_name": "kinnow mandarin",
        "category_name": "Citrus Fruits",
        "unit": "1 KG",
        "price": Decimal("75.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 9,
        "description": "Deep orange high-yield mandarin hybrid known for intense juicy sweetness and thin peel.",
        "image_url": "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 10. TROPICAL FRUITS
    # ==========================================
    {
        "name": "Robusta Bananas (पिकलेली केळी)",
        "canonical_name": "robusta banana",
        "category_name": "Tropical Fruits",
        "unit": "1 Dozen",
        "price": Decimal("45.00"),
        "stock": Decimal("100.000"),
        "shelf_life_days": 4,
        "description": "Naturally ripened sweet bananas from local plantations. High in potassium and energy for your daily breakfast.",
        "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Elaichi Small Bananas (वेलची केळी)",
        "canonical_name": "elaichi banana",
        "category_name": "Tropical Fruits",
        "unit": "1 Dozen",
        "price": Decimal("65.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 4,
        "description": "Sweet miniature bananas with thin skin and delightful honey-cardamom fragrant pulp. Loved by kids and athletes.",
        "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Papaya (गोड पपई)",
        "canonical_name": "papaya",
        "category_name": "Tropical Fruits",
        "unit": "1 Piece",
        "price": Decimal("45.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 4,
        "description": "Golden-orange flesh papaya, tender and fragrant. Naturally enzyme-rich for digestion and skin vitality.",
        "image_url": "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet White Guava / Peru (गोड पेरू)",
        "canonical_name": "guava peru",
        "category_name": "Tropical Fruits",
        "unit": "1 KG",
        "price": Decimal("55.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 5,
        "description": "Crisp fragrant white guavas with mild sweet flavor. Enjoy fresh with a sprinkle of chat masala and rock salt.",
        "image_url": "https://images.unsplash.com/photo-1536511135899-73f1d8c117b3?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Brown Chikoo / Sapota (गोड चिकू)",
        "canonical_name": "chikoo sapota",
        "category_name": "Tropical Fruits",
        "unit": "1 KG",
        "price": Decimal("60.00"),
        "stock": Decimal("65.000"),
        "shelf_life_days": 4,
        "description": "Sweet malty chikoos with brown velvety skin and brown sugary pulp. Perfect for creamy thick chikoo milkshakes.",
        "image_url": "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Tender Coconut / Shahaale (शहाळे पाणी)",
        "canonical_name": "tender coconut",
        "category_name": "Tropical Fruits",
        "unit": "1 Piece",
        "price": Decimal("50.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 6,
        "description": "Green tender coconut full of sweet electrolyte-rich water and soft delicate malai.",
        "image_url": "https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Ripe Golden Pineapple (गोड अननस)",
        "canonical_name": "pineapple ananas",
        "category_name": "Tropical Fruits",
        "unit": "1 Piece",
        "price": Decimal("65.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 6,
        "description": "Golden queen pineapple with juicy fragrant yellow slices. Balance of sweet-tart flavor rich in bromelain.",
        "image_url": "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Solapur Kesar Pomegranate (सोलापूर डाळिंब)",
        "canonical_name": "pomegranate dalimb",
        "category_name": "Tropical Fruits",
        "unit": "1 KG",
        "price": Decimal("135.00"),
        "stock": Decimal("85.000"),
        "shelf_life_days": 14,
        "description": "Locally renowned Solapur Bhagwa/Kesar pomegranates with deep ruby sweet arils and thin skin.",
        "image_url": "https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Custard Apple / Sitaphal (गोड सीताफळ)",
        "canonical_name": "custard apple sitaphal",
        "category_name": "Tropical Fruits",
        "unit": "1 KG",
        "price": Decimal("95.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 3,
        "description": "Ripe knobby green fruit filled with creamy sweet custard-like pulp. An irresistible seasonal delicacy.",
        "image_url": "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Alphonso Mango / Hapus (हापूस आंबा)",
        "canonical_name": "alphonso hapus mango",
        "category_name": "Tropical Fruits",
        "unit": "1 KG",
        "price": Decimal("280.00"),
        "stock": Decimal("30.000"),
        "shelf_life_days": 5,
        "description": "The king of mangoes with golden saffron flesh, heavenly aroma, and velvety melt-in-mouth richness.",
        "image_url": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 11. MELONS
    # ==========================================
    {
        "name": "Striped Watermelon (गोड कलिंगड)",
        "canonical_name": "watermelon kalingad",
        "category_name": "Melons",
        "unit": "1 Piece",
        "price": Decimal("65.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 7,
        "description": "Heavy striped watermelon with deep red sugary heart. Highly hydrating and refreshing for any sunny afternoon.",
        "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Golden Muskmelon / Kharbooja (गोड खरबूज)",
        "canonical_name": "muskmelon kharbooja",
        "category_name": "Melons",
        "unit": "1 Piece",
        "price": Decimal("45.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 6,
        "description": "Fragrant netted muskmelon with soft sweet cantaloupe salmon pulp and soothing honey scent.",
        "image_url": "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 12. BERRIES & STONE FRUITS
    # ==========================================
    {
        "name": "Mahabaleshwar Strawberries (ताजी स्ट्रॉबेरी)",
        "canonical_name": "strawberries",
        "category_name": "Berries & Stone Fruits",
        "unit": "200 G",
        "price": Decimal("70.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 3,
        "description": "Sweet tart crimson strawberries harvested in the misty Sahyadri hills. Delightful with cream and in dessert bowls.",
        "image_url": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Blueberries (ब्लूबेरी)",
        "canonical_name": "blueberries",
        "category_name": "Berries & Stone Fruits",
        "unit": "125 G",
        "price": Decimal("140.00"),
        "stock": Decimal("35.000"),
        "shelf_life_days": 6,
        "description": "Plump dusky blue pearls packed with superfood anthocyanins. Perfect topping for oatmeal, yoghurt, and pancakes.",
        "image_url": "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Green Seedless Grapes (हिरवी द्राक्षे)",
        "canonical_name": "green grapes",
        "category_name": "Berries & Stone Fruits",
        "unit": "500 G",
        "price": Decimal("55.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 6,
        "description": "Crisp sweet Thompson seedless grapes from Maharashtra vineyards. Juicy pop in every bite.",
        "image_url": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Black Seedless Grapes (काळी द्राक्षे)",
        "canonical_name": "black grapes",
        "category_name": "Berries & Stone Fruits",
        "unit": "500 G",
        "price": Decimal("65.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 6,
        "description": "Deep purple-black elongated seedless grapes with rich floral sweetness and thin skin.",
        "image_url": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Indian Plum / Aloo Bukhara (आलू बुखारा)",
        "canonical_name": "plum aloo bukhara",
        "category_name": "Berries & Stone Fruits",
        "unit": "500 G",
        "price": Decimal("75.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 5,
        "description": "Tender ruby-red plums with sweet-tangy succulent flesh surrounding a clean pit.",
        "image_url": "https://images.unsplash.com/photo-1522010674681-308b4ef08f5d?w=600&auto=format&fit=crop&q=80",
    },

    # ==========================================
    # 13. EXOTIC FRUITS
    # ==========================================
    {
        "name": "Royal Delicious Apples (काश्मिरी सफरचंद)",
        "canonical_name": "apple safarchand",
        "category_name": "Exotic Fruits",
        "unit": "1 KG",
        "price": Decimal("155.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 12,
        "description": "Crisp sweet apples with bright red skin and juicy bite. Freshly sorted from orchard crates.",
        "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Green Granny Smith Apples (हिरवे सफरचंद)",
        "canonical_name": "green apple",
        "category_name": "Exotic Fruits",
        "unit": "1 KG",
        "price": Decimal("180.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 15,
        "description": "Crisp tart green apples famous for their firm bite and refreshing acidity in salads and baked pies.",
        "image_url": "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Green Kiwi Fruit (किवी फळ)",
        "canonical_name": "kiwi",
        "category_name": "Exotic Fruits",
        "unit": "3 Pieces",
        "price": Decimal("75.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 7,
        "description": "Emerald green kiwi slices with tiny black edible seeds. Exceeds daily vitamin C with tangy-sweet zest.",
        "image_url": "https://images.unsplash.com/photo-1585059895524-72359e06133a?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Red Dragon Fruit (ड्रॅगन फ्रूट)",
        "canonical_name": "dragon fruit",
        "category_name": "Exotic Fruits",
        "unit": "1 Piece",
        "price": Decimal("85.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 6,
        "description": "Stunning vibrant magenta pitaya fruit with speckled black seeds. Mild sweet hydration for exotic smoothie bowls.",
        "image_url": "https://images.unsplash.com/photo-1527325678964-54921661f888?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Indian Pear / Nashpati (नाशपाती)",
        "canonical_name": "pear nashpati",
        "category_name": "Exotic Fruits",
        "unit": "1 KG",
        "price": Decimal("90.00"),
        "stock": Decimal("55.000"),
        "shelf_life_days": 8,
        "description": "Crunchy sweet golden pears with high water content and delicate aroma. Soothing and high in gentle soluble fiber.",
        "image_url": "https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=600&auto=format&fit=crop&q=80",
    },
]


def populate_catalog():
    db = SessionLocal()
    try:
        print("=== VEGITO COMPLETE VEGETABLE & FRUIT POPULATION ===")

        # 1. Ensure SELLER Role exists
        seller_role = db.query(Role).filter(Role.name == "SELLER").first()
        if not seller_role:
            seller_role = Role(id=2, name="SELLER")
            db.add(seller_role)
            db.flush()

        # 2. Ensure Primary Partner Seller exists: Rohit Mhetre (+91 88559 69612)
        user = db.query(User).filter(User.phone == "918855969612").first()
        if not user:
            user = db.query(User).filter(User.phone == "8855969612").first()
        if not user:
            user = User(
                role_id=seller_role.id,
                name="Rohit Mhetre",
                phone="918855969612",
                email="rohit.mhetre@vegito.in",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()

        address = db.query(Address).filter(Address.user_id == user.id).first()
        if not address:
            address = Address(
                user_id=user.id,
                address_line1="Shop 14, APMC Market Yard",
                city="Solapur",
                state="Maharashtra",
                country="India",
                pincode="413002",
                latitude=Decimal("17.6599187"),
                longitude=Decimal("75.9063875"),
                address_type="WORK",
                is_default=True,
            )
            db.add(address)
            db.flush()

        seller_profile = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
        if not seller_profile:
            seller_profile = SellerProfile(
                user_id=user.id,
                business_name="Shri Ganesh Vegetable Supplier (Rohit Mhetre)",
                business_type="Vegetable & Fruit Mandi Supplier",
                description="WhatsApp Catalog Partner (+91 88559 69612). Fresh farm-picked vegetables, leafy greens, root produce & fruits direct from Solapur APMC mandi.",
                address_id=address.id,
                latitude=Decimal("17.6599187"),
                longitude=Decimal("75.9063875"),
                is_verified=True,
                kyc_status="VERIFIED",
                is_available=True,
                rating=Decimal("4.90"),
                total_orders=210,
            )
            db.add(seller_profile)
            db.flush()
        else:
            seller_profile.is_verified = True
            seller_profile.is_available = True
            seller_profile.kyc_status = "VERIFIED"
            db.flush()

        # 3. Create or Update Categories
        category_map = {}
        for cdef in CATEGORIES_DEF:
            cat = db.query(Category).filter(Category.name.ilike(cdef["name"])).first()
            if not cat:
                cat = Category(
                    name=cdef["name"],
                    description=cdef["description"],
                    display_order=cdef["display_order"],
                    image_url=cdef["image_url"],
                    is_active=True,
                )
                db.add(cat)
                db.flush()
                print(f"Created Category: ID {cat.id} - {cat.name}")
            else:
                cat.description = cdef["description"]
                cat.display_order = cdef["display_order"]
                cat.image_url = cdef["image_url"]
                cat.is_active = True
                db.flush()
            category_map[cat.name.lower()] = cat

        # 4. Ingest/Update Products
        existing_products = db.query(Product).all()
        # Build normalized index: map lower alphanumeric to product
        def norm(s: str) -> str:
            clean = s.split("(")[0].strip().lower()
            return "".join(ch for ch in clean if ch.isalnum())

        prod_index = {norm(p.name): p for p in existing_products}

        today = datetime.date.today()
        now_time = datetime.datetime.now().time()
        created_count = 0
        updated_count = 0

        for pdata in COMPLETE_PRODUCTS:
            cat = category_map.get(pdata["category_name"].lower())
            if not cat:
                cat = category_map["vegetables"] if "fruit" not in pdata["category_name"].lower() else category_map["fruits"]

            target_norm = norm(pdata["canonical_name"])
            existing = prod_index.get(target_norm) or prod_index.get(norm(pdata["name"]))

            if not existing:
                # Also check ilike in DB
                base_first_word = pdata["canonical_name"].split()[0]
                existing = db.query(Product).filter(Product.name.ilike(f"%{base_first_word}%")).first()

            if not existing:
                product = Product(
                    name=pdata["name"],
                    category_id=cat.id,
                    description=pdata["description"],
                    unit=pdata["unit"],
                    shelf_life_days=pdata["shelf_life_days"],
                    freshness_category="A_PLUS",
                    is_active=True,
                )
                db.add(product)
                db.flush()
                prod_index[target_norm] = product
                created_count += 1
                print(f"+ Created: {product.name} (Cat: {cat.name})")
            else:
                product = existing
                product.name = pdata["name"]
                product.category_id = cat.id
                product.description = pdata["description"]
                product.unit = pdata["unit"]
                product.shelf_life_days = pdata["shelf_life_days"]
                product.freshness_category = "A_PLUS"
                product.is_active = True
                db.flush()
                updated_count += 1

            # Ensure ProductImage
            img = db.query(ProductImage).filter(ProductImage.product_id == product.id).first()
            if not img:
                img = ProductImage(
                    product_id=product.id,
                    image_url=pdata["image_url"],
                    is_primary=True,
                    display_order=0,
                )
                db.add(img)
            else:
                img.image_url = pdata["image_url"]
                img.is_primary = True

            # Ensure active SellerProduct offer for Rohit Mhetre
            sp = (
                db.query(SellerProduct)
                .filter(
                    SellerProduct.seller_id == user.id,
                    SellerProduct.product_id == product.id,
                )
                .first()
            )
            if not sp:
                sp = SellerProduct(
                    seller_id=user.id,
                    product_id=product.id,
                    price=pdata["price"],
                    stock_quantity=pdata["stock"],
                    minimum_order_quantity=Decimal("1.000"),
                    is_available=True,
                    added_date=today,
                    added_time=now_time,
                    harvest_date=today - datetime.timedelta(days=1),
                    harvest_time=datetime.time(5, 30),
                    storage_condition="Ambient Fresh Ventilated",
                    origin="Solapur APMC Mandi",
                )
                db.add(sp)
            else:
                sp.price = pdata["price"]
                sp.stock_quantity = pdata["stock"]
                sp.is_available = True
                sp.added_date = today

        db.commit()
        total_p = db.query(Product).count()
        total_c = db.query(Category).count()
        total_sp = db.query(SellerProduct).filter(SellerProduct.is_available == True).count()
        print(f"\nCATALOG POPULATION COMPLETE:")
        print(f"Total Categories: {total_c}")
        print(f"Total Products in DB: {total_p} (Created: {created_count}, Updated: {updated_count})")
        print(f"Total Active Seller Offers: {total_sp}")

    except Exception as e:
        db.rollback()
        print("Error during population:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    populate_catalog()
