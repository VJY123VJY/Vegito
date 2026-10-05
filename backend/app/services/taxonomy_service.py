"""
Taxonomy and Search Intelligence Engine for Vegito.
Single source of truth for Produce Classification, Synonyms, Multilingual Search, and Routing.
"""

from typing import Dict, List, Optional, Set, Tuple
from app.core.exceptions import BadRequestException

VEGETABLE_CATEGORY_IDS: Set[int] = {1, 3, 4, 50, 51, 52, 53, 54, 55}
FRUIT_CATEGORY_IDS: Set[int] = {2, 56, 57, 58, 59, 60}

# Category name to ID mapping
CATEGORY_NAME_MAP: Dict[str, int] = {
    "vegetables": 1,
    "fruits": 2,
    "leafy vegetables": 3,
    "root vegetables": 4,
    "fruit vegetables": 50,
    "gourds": 51,
    "beans & peas": 52,
    "beans and peas": 52,
    "cruciferous vegetables": 53,
    "herbs & fresh greens": 54,
    "herbs and fresh greens": 54,
    "specialty & seasonal vegetables": 55,
    "citrus fruits": 56,
    "tropical fruits": 57,
    "melons": 58,
    "berries & stone fruits": 59,
    "exotic fruits": 60,
}

# Multilingual produce synonyms: Mapping colloquial Hindi, Marathi, phonetic spellings to canonical search terms
PRODUCE_SYNONYMS: Dict[str, List[str]] = {
    # Vegetables
    "tomato": ["tomato", "tomatoes", "tamatar", "टोमॅटो", "टमाटर", "tamata"],
    "potato": ["potato", "potatoes", "batata", "aloo", "alu", "बटाटा", "आलू"],
    "onion": ["onion", "onions", "onian", "kanda", "pyaz", "pyaaz", "कांदा", "प्याज"],
    "spinach": ["spinach", "palak", "पालक"],
    "fenugreek": ["methi", "fenugreek", "मेथी"],
    "coriander": ["coriander", "kothimbir", "dhaniya", "kothmir", "कोथिंबीर", "धनिया"],
    "dill": ["dill", "shepu", "सुवा", "शेपू"],
    "mint": ["mint", "pudina", "पुदीना", "पुदिना"],
    "curry leaves": ["curry leaves", "kadi patta", "kadipatta", "कढीपत्ता", "कड़ी पत्ता"],
    "chilli": ["chilli", "chili", "mirchi", "green chilli", "मिरची", "मिर्च"],
    "ginger": ["ginger", "aale", "adrak", "आले", "अदरक"],
    "garlic": ["garlic", "lasun", "lehsun", "lahsun", "लसूण", "लहसुन"],
    "lemon": ["lemon", "lemons", "limbu", "nimbu", "लिंबू", "नींबू"],
    "cucumber": ["cucumber", "kakdi", "kheera", "काकडी", "खीरा"],
    "brinjal": ["brinjal", "eggplant", "baingan", "vangi", "वांगी", "बैंगन"],
    "okra": ["okra", "bhindi", "bhendi", "ladyfinger", "भेंडी", "भिंडी"],
    "bottle gourd": ["bottle gourd", "dudhi", "lauki", "दुधी", "लौकी"],
    "bitter gourd": ["bitter gourd", "karela", "कारले", "करेला"],
    "ridge gourd": ["ridge gourd", "dodka", "turai", "दोडका", "तोरई"],
    "snake gourd": ["snake gourd", "padwal", "पडवळ", "चिचिंडा"],
    "sponge gourd": ["sponge gourd", "ghosale", "nenua", "घोसाळे"],
    "ivy gourd": ["ivy gourd", "tondli", "kundru", "तोंडली", "कुंदरू"],
    "pumpkin": ["pumpkin", "bhopla", "kaddu", "भोपळा", "कद्दू"],
    "cabbage": ["cabbage", "kobi", "patta gobhi", "कोबी", "पत्ता गोभी"],
    "cauliflower": ["cauliflower", "flower", "phool gobhi", "फ्लॉवर", "फूलगोभी"],
    "broccoli": ["broccoli", "ब्रोकोली"],
    "peas": ["peas", "green peas", "matar", "मटार", "मटर"],
    "beans": ["beans", "farasbi", "french beans", "gawar", "cluster beans", "फरसबी", "गवार"],
    "corn": ["corn", "sweet corn", "maka", "bhutta", "मका", "भुट्टा"],
    "mushroom": ["mushroom", "mushrooms", "मशरूम"],
    "beetroot": ["beetroot", "beet", "chukandar", "बीट", "चुकंदर"],
    "radish": ["radish", "mula", "mooli", "मुळा", "मूली"],
    "carrot": ["carrot", "gajar", "गाजर"],
    "drumstick": ["drumstick", "shevga", "sahjan", "शेवगा", "सहजन"],
    "turnip": ["turnip", "shalgam", "शलजम"],
    "yam": ["yam", "suran", "jimikand", "सुरण", "जिमीकंद"],

    # Fruits
    "apple": ["apple", "apples", "seb", "safarchand", "सफरचंद", "सेब"],
    "banana": ["banana", "bananas", "kela", "keli", "केळी", "केला"],
    "mango": ["mango", "mangoes", "aam", "hapus", "alphonso", "आंबा", "आम"],
    "orange": ["orange", "oranges", "santra", "santre", "संत्री", "संतरा", "mosambi", "kinnow"],
    "sweet lime": ["sweet lime", "mosambi", "मोसंबी", "मौसमी"],
    "grapes": ["grapes", "angoor", "draksh", "द्राक्षे", "अंगूर"],
    "pomegranate": ["pomegranate", "anar", "dalimb", "डाळिंब", "अनार"],
    "papaya": ["papaya", "papai", "papita", "पपई", "पपीता"],
    "watermelon": ["watermelon", "kalingad", "tarbuj", "कलिंगड", "तरबूज"],
    "muskmelon": ["muskmelon", "kharbooja", "kharbuj", "खरबूज"],
    "guava": ["guava", "peru", "amrood", "पेरू", "अमरूद"],
    "chikoo": ["chikoo", "chiku", "sapota", "चिकू", "चीकू"],
    "pineapple": ["pineapple", "ananas", "अननस", "अनानास"],
    "custard apple": ["custard apple", "sitaphal", "sitafal", "सीताफळ", "शरीफा"],
    "coconut": ["coconut", "shahale", "nariyal", "शहाळे", "नारियल"],
    "strawberry": ["strawberry", "strawberries", "स्ट्रॉबेरी"],
    "blueberry": ["blueberry", "blueberries", "ब्लूबेरी"],
    "kiwi": ["kiwi", "किवी"],
    "dragon fruit": ["dragon fruit", "pitaya", "ड्रॅगन"],
    "pear": ["pear", "pears", "nashpati", "नाशपाती"],
    "plum": ["plum", "aloo bukhara", "आलू बुखारा"],
}

# Category synonyms for direct category intent search
CATEGORY_SEARCH_INTENTS: Dict[str, Tuple[str, List[int]]] = {
    # All vegetables intent
    "vegetable": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "vegetables": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "veggie": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "veggies": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "bhaji": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "bhajya": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "भाजी": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "भाज्या": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "sabzi": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "sabji": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "सब्जी": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),
    "सब्जियां": ("VEGETABLE", [1, 3, 4, 50, 51, 52, 53, 54, 55]),

    # All fruits intent
    "fruit": ("FRUIT", [2, 56, 57, 58, 59, 60]),
    "fruits": ("FRUIT", [2, 56, 57, 58, 59, 60]),
    "phal": ("FRUIT", [2, 56, 57, 58, 59, 60]),
    "fal": ("FRUIT", [2, 56, 57, 58, 59, 60]),
    "fale": ("FRUIT", [2, 56, 57, 58, 59, 60]),
    "फळे": ("FRUIT", [2, 56, 57, 58, 59, 60]),
    "फळ": ("FRUIT", [2, 56, 57, 58, 59, 60]),
    "फल": ("FRUIT", [2, 56, 57, 58, 59, 60]),

    # Specific category intents
    "leafy": ("VEGETABLE", [3]),
    "greens": ("VEGETABLE", [3]),
    "पालेभाज्या": ("VEGETABLE", [3]),
    "root": ("VEGETABLE", [4]),
    "tuber": ("VEGETABLE", [4]),
    "tubers": ("VEGETABLE", [4]),
    "कंदमुळे": ("VEGETABLE", [4]),
    "gourd": ("VEGETABLE", [51]),
    "gourds": ("VEGETABLE", [51]),
    "beans": ("VEGETABLE", [52]),
    "cruciferous": ("VEGETABLE", [53]),
    "herbs": ("VEGETABLE", [54]),
    "specialty": ("VEGETABLE", [55]),
    "seasonal": ("VEGETABLE", [55]),
    "citrus": ("FRUIT", [56]),
    "tropical": ("FRUIT", [57]),
    "melon": ("FRUIT", [58]),
    "melons": ("FRUIT", [58]),
    "berries": ("FRUIT", [59]),
    "exotic": ("FRUIT", [60]),
}


class TaxonomyService:
    """Provides product auto-routing, category classification, and smart query expansion."""

    @staticmethod
    def get_category_type(category_id: int) -> str:
        """Returns 'VEGETABLE' or 'FRUIT' for a category ID."""
        if category_id in VEGETABLE_CATEGORY_IDS:
            return "VEGETABLE"
        if category_id in FRUIT_CATEGORY_IDS:
            return "FRUIT"
        return "UNKNOWN"

    @staticmethod
    def validate_category_and_type(product_type: Optional[str], category_id: Optional[int]) -> None:
        """
        Validates that product_type and category_id do not conflict.
        Raises BadRequestException on invalid combinations.
        """
        if not product_type or not category_id:
            return

        p_type = product_type.strip().upper()
        if p_type == "VEGETABLE" and category_id in FRUIT_CATEGORY_IDS:
            raise BadRequestException(f"Invalid category: Vegetable products cannot belong to fruit category (ID {category_id})")
        if p_type == "FRUIT" and category_id in VEGETABLE_CATEGORY_IDS:
            raise BadRequestException(f"Invalid category: Fruit products cannot belong to vegetable category (ID {category_id})")

    @staticmethod
    def auto_classify_produce(name: str, product_type: Optional[str] = None) -> Tuple[str, int]:
        """
        Automatically classifies product name to (product_type, category_id).
        Example:
          'Tomato' -> ('VEGETABLE', 50)
          'Spinach' -> ('VEGETABLE', 3)
          'Potato' -> ('VEGETABLE', 4)
          'Apple' -> ('FRUIT', 60)
          'Orange' -> ('FRUIT', 56)
        """
        name_lower = name.strip().lower()

        # Check explicit fruit indicators
        is_fruit_hint = product_type and product_type.strip().upper() == "FRUIT"

        # 1. Citrus Fruits (Cat 56)
        if any(w in name_lower for w in ["orange", "santra", "mosambi", "kinnow", "sweet lime", "mandarin", "grapefruit"]):
            return ("FRUIT", 56)

        # 2. Tropical Fruits (Cat 57)
        if any(w in name_lower for w in ["banana", "kela", "mango", "aam", "hapus", "pomegranate", "anar", "dalimb", "papaya", "papai", "guava", "peru", "chikoo", "sapota", "pineapple", "ananas", "custard apple", "sitaphal", "coconut", "shahale", "jackfruit"]):
            return ("FRUIT", 57)

        # 3. Melons (Cat 58)
        if any(w in name_lower for w in ["watermelon", "kalingad", "tarbuj", "muskmelon", "kharbooja", "cantaloupe", "honeydew"]):
            return ("FRUIT", 58)

        # 4. Berries & Stone Fruits (Cat 59)
        if any(w in name_lower for w in ["strawberry", "blueberry", "raspberry", "grape", "draksh", "angoor", "plum", "cherry", "peach", "apricot"]):
            return ("FRUIT", 59)

        # 5. Exotic Fruits (Cat 60)
        if any(w in name_lower for w in ["apple", "seb", "safarchand", "kiwi", "dragon fruit", "pear", "nashpati", "avocado", "fig", "dates"]):
            return ("FRUIT", 60)

        # 6. Leafy Vegetables (Cat 3)
        if any(w in name_lower for w in ["spinach", "palak", "methi", "fenugreek", "coriander", "kothimbir", "dhaniya", "dill", "shepu", "mint", "pudina", "curry leave", "kadi patta", "lettuce", "amaranth"]):
            return ("VEGETABLE", 3)

        # 7. Root Vegetables (Cat 4)
        if any(w in name_lower for w in ["potato", "batata", "aloo", "onion", "kanda", "pyaz", "shallot", "beetroot", "radish", "mula", "turnip", "shalgam", "yam", "suran", "taro", "sweet potato"]):
            return ("VEGETABLE", 4)

        # 8. Gourds (Cat 51)
        if any(w in name_lower for w in ["bottle gourd", "dudhi", "lauki", "bitter gourd", "karela", "ridge gourd", "dodka", "snake gourd", "padwal", "sponge gourd", "ghosale", "ivy gourd", "tondli", "ash gourd", "pumpkin", "bhopla"]):
            return ("VEGETABLE", 51)

        # 9. Beans & Peas (Cat 52)
        if any(w in name_lower for w in ["green pea", "matar", "pea", "gawar", "cluster bean", "french bean", "farasbi", "flat bean", "walor", "chawli", "harbhara"]):
            return ("VEGETABLE", 52)

        # 10. Cruciferous (Cat 53)
        if any(w in name_lower for w in ["cabbage", "kobi", "cauliflower", "flower", "gobhi", "broccoli"]):
            return ("VEGETABLE", 53)

        # 11. Herbs & Greens (Cat 54)
        if any(w in name_lower for w in ["ginger", "aale", "adrak", "garlic", "lasun", "lehsun", "lemon", "limbu", "celery", "lemongrass"]):
            return ("VEGETABLE", 54)

        # 12. Fruit Vegetables (Cat 50)
        if any(w in name_lower for w in ["tomato", "tamatar", "brinjal", "eggplant", "baingan", "capsicum", "bell pepper", "chilli", "mirchi", "okra", "bhindi", "cucumber", "kakdi"]):
            return ("VEGETABLE", 50)

        # 13. Specialty & Seasonal (Cat 55)
        if any(w in name_lower for w in ["corn", "maka", "mushroom", "zucchini", "drumstick", "shevga"]):
            return ("VEGETABLE", 55)

        # Default fallback based on product_type hint or general Produce
        if is_fruit_hint:
            return ("FRUIT", 60)
        return ("VEGETABLE", 50)

    @staticmethod
    def expand_search_terms(search: str) -> List[str]:
        """
        Expands search terms into English, Marathi, Hindi keywords and synonyms.
        """
        clean = search.strip().lower()
        expanded: Set[str] = {clean}

        # Check direct synonyms table
        for canonical, syn_list in PRODUCE_SYNONYMS.items():
            if any(syn in clean or clean in syn for syn in syn_list):
                expanded.add(canonical)
                expanded.update(syn_list)

        return list(expanded)

    @staticmethod
    def get_category_intent(search: str) -> Optional[Tuple[str, List[int]]]:
        """
        Checks if the query is a category intent like 'vegetables', 'fruits', 'citrus', 'leafy'.
        Returns (product_type, list_of_category_ids) or None.
        """
        clean = search.strip().lower()
        return CATEGORY_SEARCH_INTENTS.get(clean)
