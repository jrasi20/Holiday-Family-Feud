export const BIBLE_ROUNDS = [
  { q:"Name someone who received an angelic message connected to Jesus' birth.", ref:"Matthew 1-2; Luke 1-2", mult:1, a:[["Mary",30],["Joseph",24],["Shepherds",20],["Zechariah",16],["Magi (in a dream)",10]] },
  { q:"Name a gift the Magi brought to Jesus.", ref:"Matthew 2:11", mult:1, a:[["Gold",40],["Frankincense",32],["Myrrh",28]] },
  { q:"Name a place in the biblical Christmas story.", ref:"Matthew 1-2; Luke 1-2", mult:1, a:[["Bethlehem",30],["Nazareth",22],["Jerusalem",18],["The fields",12],["Egypt",10],["The manger",8]] },
  { q:"Name a person or group seen in a Nativity scene.", ref:"Matthew 1-2; Luke 1-2", mult:1, a:[["Jesus",24],["Mary",20],["Joseph",18],["Shepherds",14],["Magi",12],["Angels",8],["Animals",4]] },
  { q:"Name something the angels do or say in the birth story.", ref:"Luke 1-2", mult:2, a:[["Praise God",28],["Say 'Do not be afraid'",24],["Announce good news",20],["Tell where to find Jesus",16],["Declare peace",12]] },
  { q:"Name a title or name given to Jesus in the birth accounts.", ref:"Matthew 1; Luke 1-2", mult:2, a:[["Jesus",24],["Savior",20],["Christ / Messiah",18],["Immanuel",16],["Lord",12],["Son of the Most High",10]] },
  { q:"Name an animal commonly pictured at the Nativity but not named in the birth texts.", ref:"Tradition check: Matthew 1-2; Luke 1-2", mult:2, a:[["Donkey",30],["Sheep",26],["Camel",22],["Ox / cattle",14],["Dove",8]] },
  { q:"Name a reason someone traveled in the Christmas story.", ref:"Matthew 2; Luke 2", mult:2, a:[["To register for the census",28],["To worship Jesus",24],["To escape Herod",20],["To return home",16],["To follow the star",12]] },
  { q:"Name a heavenly sign or message in the Christmas story.", ref:"Matthew 1-2; Luke 1-2", mult:3, a:[["The star",34],["An angel",30],["The glory of the Lord",20],["A dream",16]] },
  { q:"Name a faith-centered Christmas tradition families enjoy.", ref:"Celebration round", mult:3, a:[["Read the Nativity story",24],["Attend a church service",20],["Pray together",16],["Sing Christmas hymns",14],["Give to others",12],["Display a Nativity",8],["Share a special meal",6]] }
];

export const HOLIDAY_ROUNDS = [
  { q:"Name something that goes wrong while decorating the Christmas tree.", ref:"Holiday Hilarity", mult:1, a:[["The lights do not work",28],["The tree leans",22],["An ornament breaks",18],["The lights tangle",14],["Someone argues about the topper",10],["The pet attacks it",8]] },
  { q:"Name an excuse for arriving late to Christmas dinner.", ref:"Holiday Hilarity", mult:1, a:[["Traffic",26],["Still wrapping gifts",22],["Kids were not ready",18],["Cooking took too long",14],["Went to the wrong house",12],["Could not find the keys",8]] },
  { q:"Name something a family realizes they forgot on the way to church.", ref:"Holiday Hilarity", mult:1, a:[["The casserole",24],["A gift",20],["The Bible",18],["The offering",14],["A child's costume",14],["Grandma",10]] },
  { q:"Name a Christmas gift nobody in the family knows how to use.", ref:"Holiday Hilarity", mult:2, a:[["A smart gadget",28],["Exercise equipment",22],["A kitchen appliance",18],["A complicated toy",14],["A mystery tool",10],["Anything with no instructions",8]] },
  { q:"Name something that makes Christmas caroling hilariously awkward.", ref:"Holiday Hilarity", mult:2, a:[["Nobody knows the lyrics",26],["Everyone starts in a different key",22],["The dog joins in",18],["Nobody answers the door",14],["One person sings a solo",12],["You visit the wrong house",8]] },
  { q:"Name something a relative says every single Christmas.", ref:"Holiday Hilarity", mult:2, a:[["You have grown so much",24],["Dinner is almost ready",20],["Who wants leftovers?",18],["We need a family photo",16],["Do not touch that yet",12],["I remember when...",10]] },
  { q:"Name the first treat to vanish from the holiday dessert table.", ref:"Holiday Hilarity", mult:3, a:[["Christmas cookies",28],["Pie",22],["Brownies",18],["Fudge",14],["Cheesecake",10],["Anything chocolate",8]] },
  { q:"Name a reason a child claims they cannot sleep on Christmas Eve.", ref:"Holiday Hilarity", mult:3, a:[["Listening for Santa",28],["Too excited",24],["Checking the presents",18],["Ate too much sugar",12],["Heard a noise",10],["Needs one more snack",8]] }
];

export const FAST_MONEY = [
  { q:"Name someone seen in a Nativity scene.", a:[["Jesus",30],["Mary",24],["Joseph",18],["Shepherd",16],["Magi",12]] },
  { q:"Name something people bring to a Christmas potluck.", a:[["Dessert",30],["Casserole",24],["Rolls",18],["Drinks",16],["Chips or dip",12]] },
  { q:"Name something children do in a Christmas program.", a:[["Sing",30],["Wave",24],["Forget a line",18],["Fidget",16],["Giggle",12]] },
  { q:"Name a word heard in a Christmas hymn.", a:[["Joy",30],["Peace",24],["Glory",18],["Angel",16],["Holy",12]] },
  { q:"Name something families do before opening gifts.", a:[["Pray",30],["Eat breakfast",24],["Take photos",18],["Read Scripture",16],["Wake everyone",12]] }
];

export const WHO_SAID_IT = [
  { q:"You will have a son, and you will name him Jesus.", choices:["Gabriel","Joseph","Simeon","Zechariah"], answer:0, note:"Gabriel's message to Mary - Luke 1:31" },
  { q:"How can this happen?", choices:["Elizabeth","Mary","Anna","A shepherd"], answer:1, note:"Mary responds to Gabriel - Luke 1:34" },
  { q:"Blessed are you among women.", choices:["Elizabeth","Anna","A heavenly host","Joseph"], answer:0, note:"Elizabeth greets Mary - Luke 1:42" },
  { q:"His name is John.", choices:["Joseph","Gabriel","Zechariah","Herod"], answer:2, note:"Zechariah writes the child's name - Luke 1:63" },
  { q:"Let us go to Bethlehem and see what has happened.", choices:["The Magi","The shepherds","Mary and Joseph","Herod's advisers"], answer:1, note:"The shepherds respond to the angelic news - Luke 2:15" },
  { q:"Where is the child born king of the Jews?", choices:["Herod","The shepherds","The Magi","Simeon"], answer:2, note:"The Magi ask in Jerusalem - Matthew 2:2" },
  { q:"My eyes have seen your salvation.", choices:["Simeon","Zechariah","Joseph","Gabriel"], answer:0, note:"Simeon's praise in the temple - Luke 2:30" },
  { q:"Glory to God in the highest.", choices:["The shepherds","The heavenly host","The Magi","The priests"], answer:1, note:"The heavenly host praises God - Luke 2:14" }
];

export const TRIVIA = [
  { q:"Which two Gospels include accounts of Jesus' birth?", choices:["Matthew and Luke","Mark and John","Matthew and John","Luke and John"], answer:0, note:"Matthew 1-2 and Luke 1-2" },
  { q:"Why did Joseph travel to Bethlehem?", choices:["A wedding","A census registration","A festival","A new job"], answer:1, note:"Luke 2:1-5" },
  { q:"Where was the newborn Jesus laid?", choices:["A cradle","A basket","A manger","A bed"], answer:2, note:"Luke 2:7" },
  { q:"How many Magi does Matthew specify?", choices:["Two","Three","Twelve","The number is not stated"], answer:3, note:"Three gifts are named, but not the number of Magi - Matthew 2:11" },
  { q:"Where did the Magi find the child?", choices:["In a house","In the temple","In a palace","In the fields"], answer:0, note:"Matthew 2:11" },
  { q:"Who leaped in Elizabeth's womb when Mary arrived?", choices:["Jesus","John","Samuel","Isaac"], answer:1, note:"Luke 1:41" },
  { q:"Which gift was NOT brought by the Magi?", choices:["Gold","Frankincense","Silver","Myrrh"], answer:2, note:"Matthew 2:11" },
  { q:"Who warned Joseph to flee to Egypt?", choices:["A shepherd","An angel in a dream","A priest","A Magi messenger"], answer:1, note:"Matthew 2:13" }
];

export const WHICH_FIRST = [
  { q:"Which happened first?", choices:["Gabriel visited Zechariah","Gabriel visited Mary"], answer:0, note:"Luke 1:11-20 comes before Luke 1:26-38" },
  { q:"Which happened first?", choices:["Mary visited Elizabeth","Jesus was born"], answer:0, note:"Luke 1:39-45 comes before Luke 2" },
  { q:"Which happened first?", choices:["Joseph traveled for the census","The shepherds visited Jesus"], answer:0, note:"Luke 2:4-7 comes before Luke 2:15-16" },
  { q:"Which happened first?", choices:["The angel spoke to the shepherds","The shepherds went to Bethlehem"], answer:0, note:"Luke 2:9-15" },
  { q:"Which happened first?", choices:["The Magi saw the star","The Magi met Herod"], answer:0, note:"Matthew 2:2 precedes their audience with Herod" },
  { q:"Which happened first?", choices:["The Magi visited Jesus","Joseph fled to Egypt"], answer:0, note:"Matthew 2:11-14" },
  { q:"Which happened first?", choices:["The Magi left by another route","Herod ordered the killing of the children"], answer:0, note:"Matthew 2:12 comes before Matthew 2:16" },
  { q:"Which happened first?", choices:["The family returned from Egypt","They settled in Nazareth"], answer:0, note:"Matthew 2:19-23" }
];
