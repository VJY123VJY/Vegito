import datetime
from decimal import Decimal
import os
import sys

# Ensure UTF-8 output on Windows console
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

CATALOG_PRODUCTS = [
    # --- ROOT VEGETABLES ---
    {
        "name": "Fresh Red Onion (गावरान लाल कांदा)",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("38.00"),
        "stock": Decimal("250.000"),
        "shelf_life_days": 14,
        "freshness_category": "A_PLUS",
        "description": "Farm-fresh Solapur mandi red onions. Dry outer skin, firm texture, pungent aroma ideal for gravies and daily cooking.",
        "image_url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "White Onion (पांढरा कांदा)",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("42.00"),
        "stock": Decimal("100.000"),
        "shelf_life_days": 12,
        "freshness_category": "A_PLUS",
        "description": "Mild sweet white onions, excellent for raw salads, sandwiches, and traditional Maharashtra dishes.",
        "image_url": "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Jyoti Potatoes (बटाटा)",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("32.00"),
        "stock": Decimal("300.000"),
        "shelf_life_days": 15,
        "freshness_category": "A_PLUS",
        "description": "Starch-rich golden potatoes with smooth thin skin. Perfect for crispy fries, sabzi, batata vada, and roasting.",
        "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Baby Potatoes (दम बटाटा)",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("36.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 15,
        "freshness_category": "A_PLUS",
        "description": "Uniform small round potatoes ideal for dum aloo curries, roasting, and spiced dry fry.",
        "image_url": "https://images.unsplash.com/photo-1508313880080-c5bef0730395?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Sweet Red Carrots (गाजर)",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("45.00"),
        "stock": Decimal("110.000"),
        "shelf_life_days": 8,
        "freshness_category": "A_PLUS",
        "description": "Crisp juicy red carrots, naturally sweet and rich in beta-carotene. Great for salads, juices, and gajar halwa.",
        "image_url": "https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Beetroot (ताजे बीट)",
        "category_name": "Root Vegetables",
        "unit": "1 KG",
        "price": Decimal("40.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 10,
        "freshness_category": "A_PLUS",
        "description": "Deep crimson earthen-grown beetroots with clean earthy flavor. Packed with antioxidants for healthy juices and salads.",
        "image_url": "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "White Radish / Mula (मुळा)",
        "category_name": "Root Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("25.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 6,
        "freshness_category": "A_PLUS",
        "description": "Crisp pungent white radishes with fresh green leaves attached. Great for mooli parathas, salads, and sambar.",
        "image_url": "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80",
    },

    # --- VEGETABLES ---
    {
        "name": "Fresh Hybrid Tomatoes (हायब्रिड टोमॅटो)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("38.00"),
        "stock": Decimal("150.000"),
        "shelf_life_days": 7,
        "freshness_category": "A_PLUS",
        "description": "Plump red hybrid tomatoes with glossy skin and balanced acidity. Perfect for curries, purées, and fresh salads.",
        "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Desi Country Tomatoes (गावरान टोमॅटो)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("42.00"),
        "stock": Decimal("95.000"),
        "shelf_life_days": 5,
        "freshness_category": "A_PLUS",
        "description": "Tangy aromatic country tomatoes harvested straight from local farms for authentic flavor in Maharashtra dal and curries.",
        "image_url": "https://images.unsplash.com/photo-1546470427-0d4db154ceb7?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Cauliflower (फ्लॉवर)",
        "category_name": "Vegetables",
        "unit": "1 Piece",
        "price": Decimal("40.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 6,
        "freshness_category": "A_PLUS",
        "description": "Compact white curd surrounded by protective crisp green leaves. Clean and pesticide-free, great for aloo gobi.",
        "image_url": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Green Cabbage (हिरवा कोबी)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("32.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 10,
        "freshness_category": "A_PLUS",
        "description": "Tight, crunchy layered green cabbage heads. Retains crispness in stir-fries, rolls, salads, and vegetable noodles.",
        "image_url": "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Tender Okra / Lady Finger (कोवळी भेंडी)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("52.00"),
        "stock": Decimal("85.000"),
        "shelf_life_days": 5,
        "freshness_category": "A_PLUS",
        "description": "Small, tender snap-fresh okra pods with minimal seeds. Cooks up crisp and non-slimy in bhindi masala and fry.",
        "image_url": "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Purple Brinjal / Vangi (काटेरी वांगी)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("44.00"),
        "stock": Decimal("75.000"),
        "shelf_life_days": 6,
        "freshness_category": "A_PLUS",
        "description": "Tender small purple spiny brinjals famous in Solapur for stuffed Bharli Vangi and traditional coconut peanut gravy.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Green Bottle Gourd / Dudhi (दुधी भोपळा)",
        "category_name": "Vegetables",
        "unit": "1 Piece",
        "price": Decimal("32.00"),
        "stock": Decimal("55.000"),
        "shelf_life_days": 7,
        "freshness_category": "A_PLUS",
        "description": "Hydrating light green bottle gourd with tender white flesh. Perfect for light evening soups, lauki kofta, and halwa.",
        "image_url": "https://images.unsplash.com/photo-1582515073490-39981397c445?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Crisp Bitter Gourd / Karela (कारले)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("52.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 7,
        "freshness_category": "A_PLUS",
        "description": "Dark green ridged bitter gourds rich in nutrients and blood-purifying properties. Great for stuffed bharwa karela.",
        "image_url": "https://images.unsplash.com/photo-1615485290176-7c0a6b933d6b?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Ridge Gourd / Dodka (दोडका)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("56.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 6,
        "freshness_category": "A_PLUS",
        "description": "Tender fresh ridged gourds with soft pulp. Easy on digestion, ideal for quick homestyle stir-fries and dals.",
        "image_url": "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Green Capsicum / Shimla Mirchi (ढोबळी मिरची)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("60.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 7,
        "freshness_category": "A_PLUS",
        "description": "Glossy bell peppers with thick walls and crunchy bite. Excellent for pizza, stir fry, and paneer tikka skewers.",
        "image_url": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Crispy Green Cucumber (काकडी)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("34.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 6,
        "freshness_category": "A_PLUS",
        "description": "Cool hydrating salad cucumbers with tender skin and refreshing crunch. Best for raita, koshimbir, and morning snacks.",
        "image_url": "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Green Peas / Matar (ताजा मटार)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("78.00"),
        "stock": Decimal("85.000"),
        "shelf_life_days": 6,
        "freshness_category": "A_PLUS",
        "description": "Full pods loaded with naturally sweet green pearls. Ideal for matar paneer, pulao, aloo matar, and parathas.",
        "image_url": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Cluster Beans / Gawar (ताजी गवार)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("62.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 5,
        "freshness_category": "A_PLUS",
        "description": "Tender young gawar beans free of tough fiber. Delicious when prepared with roasted peanut powder and garlic.",
        "image_url": "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "French Beans / Farasbi (फरसबी)",
        "category_name": "Vegetables",
        "unit": "1 KG",
        "price": Decimal("65.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 6,
        "freshness_category": "A_PLUS",
        "description": "Slender stringless green beans rich in dietary fiber. Snaps crisp for poriyal, fried rice, and vegetable pulao.",
        "image_url": "https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Drumstick / Shevga (शेवगा शेंगा)",
        "category_name": "Vegetables",
        "unit": "500 G",
        "price": Decimal("40.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 6,
        "freshness_category": "A_PLUS",
        "description": "Fleshy drumsticks with rich aromatic pulp. Essential for authentic South Indian sambar and Maharashtrian curries.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Corn Cob (अमेरिकन मका)",
        "category_name": "Vegetables",
        "unit": "2 Pieces",
        "price": Decimal("35.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 5,
        "freshness_category": "A_PLUS",
        "description": "Sweet golden kernels tightly packed on fresh cobs with green husks intact. Boil, steam, or roast with lime and butter.",
        "image_url": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80",
    },

    # --- LEAFY VEGETABLES ---
    {
        "name": "Fresh Spinach / Palak (ताजा पालक)",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("22.00"),
        "stock": Decimal("120.000"),
        "shelf_life_days": 3,
        "freshness_category": "A_PLUS",
        "description": "Dark green tender spinach leaves harvested at dawn. Rich in iron and folate for palak paneer and healthy smoothies.",
        "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Desi Fenugreek / Methi (गावरान मेथी)",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("26.00"),
        "stock": Decimal("110.000"),
        "shelf_life_days": 3,
        "freshness_category": "A_PLUS",
        "description": "Fragrant small-leaf country methi with distinctive earthy bitterness. Ideal for aloo methi and soft methi thepla.",
        "image_url": "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Coriander / Kothimbir (ताजी कोथिंबीर)",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("20.00"),
        "stock": Decimal("160.000"),
        "shelf_life_days": 4,
        "freshness_category": "A_PLUS",
        "description": "Aromatic fresh cilantro with vibrant green leaves and tender stems. Enhances every dish as a finishing garnish.",
        "image_url": "https://images.unsplash.com/photo-1588879462615-5c1cf78dc3b9?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Shepu / Dill Leaves (शेपू भाजी)",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("20.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 3,
        "freshness_category": "A_PLUS",
        "description": "Pungent feathery dill leaves loved for wholesome digestion. Great cooked with yellow moong dal.",
        "image_url": "https://images.unsplash.com/photo-1615485290176-7c0a6b933d6b?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Mint / Pudina (पुदिना)",
        "category_name": "Leafy Vegetables",
        "unit": "1 Bunch",
        "price": Decimal("15.00"),
        "stock": Decimal("80.000"),
        "shelf_life_days": 4,
        "freshness_category": "A_PLUS",
        "description": "Crisp aromatic spearmint leaves for cooling chaas, chutney, biryani marinades, and tea infusions.",
        "image_url": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Curry Leaves / Kadi Patta (कढीपत्ता)",
        "category_name": "Leafy Vegetables",
        "unit": "100 G",
        "price": Decimal("12.00"),
        "stock": Decimal("75.000"),
        "shelf_life_days": 7,
        "freshness_category": "A_PLUS",
        "description": "Hand-picked fragrant curry leaves. Releases quintessential tempering aroma in mustard and cumin tadka.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },

    # --- HERBS, CHILLIES & CITRUS ---
    {
        "name": "Spicy Green Chillies (तिखट हिरवी मिरची)",
        "category_name": "Vegetables",
        "unit": "250 G",
        "price": Decimal("18.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 10,
        "freshness_category": "A_PLUS",
        "description": "Slender fiery green chillies from regional farms. Adds sharp heat and punch to Maharashtrian thecha and curries.",
        "image_url": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Fresh Ginger / Aale (ताजे आले)",
        "category_name": "Vegetables",
        "unit": "250 G",
        "price": Decimal("32.00"),
        "stock": Decimal("70.000"),
        "shelf_life_days": 14,
        "freshness_category": "A_PLUS",
        "description": "Juicy unbleached fresh ginger rhizomes packed with warm spice and digestive warmth for chai and marinades.",
        "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Desi Garlic / Lasun (गावरान लसूण)",
        "category_name": "Vegetables",
        "unit": "250 G",
        "price": Decimal("48.00"),
        "stock": Decimal("65.000"),
        "shelf_life_days": 30,
        "freshness_category": "A_PLUS",
        "description": "Aromatic small-clove country garlic with intense flavor oils. Essential for garlic chutneys and tadka.",
        "image_url": "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Juicy Yellow Lemons (रसरशीत लिंबू)",
        "category_name": "Vegetables",
        "unit": "4 Pieces",
        "price": Decimal("18.00"),
        "stock": Decimal("120.000"),
        "shelf_life_days": 10,
        "freshness_category": "A_PLUS",
        "description": "Thin-skinned citrus lemons brimming with vitamin-C rich juice. Perfect for nimbu pani, garnishing, and marinades.",
        "image_url": "https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=600&auto=format&fit=crop&q=80",
    },

    # --- FRUITS ---
    {
        "name": "Robusta Bananas (पिकलेली केळी)",
        "category_name": "Fruits",
        "unit": "1 Dozen",
        "price": Decimal("45.00"),
        "stock": Decimal("90.000"),
        "shelf_life_days": 4,
        "freshness_category": "A_PLUS",
        "description": "Naturally ripened sweet bananas from local plantations. High in potassium and energy for your daily breakfast.",
        "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Royal Delicious Apples (काश्मिरी सफरचंद)",
        "category_name": "Fruits",
        "unit": "1 KG",
        "price": Decimal("155.00"),
        "stock": Decimal("65.000"),
        "shelf_life_days": 12,
        "freshness_category": "A_PLUS",
        "description": "Crisp sweet apples with bright red skin and juicy bite. Freshly sorted from orchard crates.",
        "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Solapur Kesar Pomegranate (सोलापूर डाळिंब)",
        "category_name": "Fruits",
        "unit": "1 KG",
        "price": Decimal("135.00"),
        "stock": Decimal("75.000"),
        "shelf_life_days": 14,
        "freshness_category": "A_PLUS",
        "description": "Locally renowned Solapur Bhagwa/Kesar pomegranates with deep ruby sweet arils and thin skin.",
        "image_url": "https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Oranges / Santra (संत्री)",
        "category_name": "Fruits",
        "unit": "1 KG",
        "price": Decimal("85.00"),
        "stock": Decimal("60.000"),
        "shelf_life_days": 8,
        "freshness_category": "A_PLUS",
        "description": "Juicy sweet-tart seasonal oranges bursting with pulpy citrus juice. Refreshing and vitamin-rich.",
        "image_url": "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet Papaya (गोड पपई)",
        "category_name": "Fruits",
        "unit": "1 Piece",
        "price": Decimal("45.00"),
        "stock": Decimal("40.000"),
        "shelf_life_days": 4,
        "freshness_category": "A_PLUS",
        "description": "Golden-orange flesh papaya, tender and fragrant. Naturally enzyme-rich for digestion and skin vitality.",
        "image_url": "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sweet White Guava / Peru (गोड पेरू)",
        "category_name": "Fruits",
        "unit": "1 KG",
        "price": Decimal("55.00"),
        "stock": Decimal("50.000"),
        "shelf_life_days": 5,
        "freshness_category": "A_PLUS",
        "description": "Crisp fragrant white guavas with mild sweet flavor. Enjoy fresh with a sprinkle of chat masala and rock salt.",
        "image_url": "https://images.unsplash.com/photo-1536511135899-73f1d8c117b3?w=600&auto=format&fit=crop&q=80",
    },
    {
        "name": "Striped Watermelon (गोड कलिंगड)",
        "category_name": "Fruits",
        "unit": "1 Piece",
        "price": Decimal("65.00"),
        "stock": Decimal("45.000"),
        "shelf_life_days": 7,
        "freshness_category": "A_PLUS",
        "description": "Heavy striped watermelon with deep red sugary heart. Highly hydrating and refreshing for any sunny afternoon.",
        "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
    },
]


def run_import():
    db = SessionLocal()
    try:
        print("=== VEGITO WHATSAPP CATALOG IMPORT ===")
        print("Seller: Rohit Mhetre (Shri Ganesh Vegetable Supplier, Solapur)")
        print("WhatsApp link: https://wa.me/c/918855969612\n")

        # 1. Ensure SELLER role exists
        seller_role = db.query(Role).filter(Role.name == "SELLER").first()
        if not seller_role:
            seller_role = Role(id=2, name="SELLER")
            db.add(seller_role)
            db.flush()

        # 2. Find or create User for Rohit Mhetre (+918855969612)
        phone = "918855969612"
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            # Check without 91 prefix
            user = db.query(User).filter(User.phone == "8855969612").first()

        if not user:
            print(f"Creating user for Rohit Mhetre with phone {phone}...")
            user = User(
                role_id=seller_role.id,
                name="Rohit Mhetre",
                phone=phone,
                email="rohit.mhetre@vegito.in",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()
        else:
            print(f"Found existing user ID {user.id} for phone {user.phone}")
            user.name = "Rohit Mhetre"
            user.role_id = seller_role.id
            user.is_verified = True
            db.flush()

        # 3. Find or create Address and SellerProfile
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
            print(f"Creating SellerProfile for user {user.id}...")
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
                total_orders=185,
            )
            db.add(seller_profile)
            db.flush()
        else:
            print(f"Updating SellerProfile ID {seller_profile.id}...")
            seller_profile.business_name = "Shri Ganesh Vegetable Supplier (Rohit Mhetre)"
            seller_profile.address_id = address.id
            seller_profile.is_verified = True
            seller_profile.is_available = True
            seller_profile.kyc_status = "VERIFIED"
            db.flush()

        # 4. Cache categories
        categories = {c.name.lower(): c for c in db.query(Category).all()}
        for cat_name in ["Vegetables", "Fruits", "Leafy Vegetables", "Root Vegetables"]:
            if cat_name.lower() not in categories:
                cat = Category(name=cat_name, description=f"Fresh {cat_name.lower()}")
                db.add(cat)
                db.flush()
                categories[cat_name.lower()] = cat

        # 5. Insert or update products
        today = datetime.date.today()
        now_time = datetime.datetime.now().time()
        imported_count = 0

        for item in CATALOG_PRODUCTS:
            cat = categories.get(item["category_name"].lower())
            if not cat:
                cat = categories["vegetables"]

            # Match product by name prefix or exact name
            product = db.query(Product).filter(Product.name == item["name"]).first()
            if not product:
                # Also check without Marathi suffix
                base_name = item["name"].split("(")[0].strip()
                product = db.query(Product).filter(Product.name.ilike(f"{base_name}%")).first()

            if not product:
                product = Product(
                    name=item["name"],
                    category_id=cat.id,
                    description=item["description"],
                    unit=item["unit"],
                    shelf_life_days=item["shelf_life_days"],
                    freshness_category=item["freshness_category"],
                    is_active=True,
                )
                db.add(product)
                db.flush()
                print(f"Created Product: ID {product.id} - {product.name}")
            else:
                product.name = item["name"]
                product.category_id = cat.id
                product.description = item["description"]
                product.unit = item["unit"]
                product.shelf_life_days = item["shelf_life_days"]
                product.freshness_category = item["freshness_category"]
                product.is_active = True
                db.flush()

            # Ensure ProductImage
            existing_img = db.query(ProductImage).filter(ProductImage.product_id == product.id).first()
            if not existing_img:
                img = ProductImage(
                    product_id=product.id,
                    image_url=item["image_url"],
                    is_primary=True,
                    display_order=0,
                )
                db.add(img)
            else:
                existing_img.image_url = item["image_url"]

            # Ensure SellerProduct offer for Rohit Mhetre
            seller_product = (
                db.query(SellerProduct)
                .filter(
                    SellerProduct.seller_id == user.id,
                    SellerProduct.product_id == product.id,
                )
                .first()
            )
            if not seller_product:
                seller_product = SellerProduct(
                    seller_id=user.id,
                    product_id=product.id,
                    price=item["price"],
                    stock_quantity=item["stock"],
                    minimum_order_quantity=Decimal("1.000"),
                    is_available=True,
                    added_date=today,
                    added_time=now_time,
                    harvest_date=today - datetime.timedelta(days=1),
                    harvest_time=datetime.time(5, 30),
                    storage_condition="Ambient Fresh Ventilated",
                    origin="Solapur Mandi",
                )
                db.add(seller_product)
            else:
                seller_product.price = item["price"]
                seller_product.stock_quantity = item["stock"]
                seller_product.is_available = True
                seller_product.added_date = today

            imported_count += 1

        db.commit()
        print(f"\nSUCCESS: Imported / updated {imported_count} products for Rohit Mhetre (+918855969612)!")

    except Exception as e:
        db.rollback()
        print("ERROR during import:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_import()
