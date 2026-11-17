const board = (id, category, q, ref, a) => ({ id, category, q, ref, a });

export const SURVEY_BANK = [
  board("b01","Bible","Name a person or group who received supernatural guidance connected to Jesus' birth.","Matthew 1–2; Luke 1–2",[["Mary",28],["Joseph",22],["Shepherds",18],["Zechariah",14],["Magi in a dream",10],["Simeon by the Spirit",8]]),
  board("b02","Bible","Name a place connected to the Nativity story.","Matthew 2; Luke 1–2",[["Bethlehem",25],["Nazareth",20],["Jerusalem",18],["Shepherds' fields",15],["Temple",12],["Egypt",10]]),
  board("b03","Bible","Name a title or name used for Jesus in the birth narratives.","Matthew 1:21–23; Luke 1:32; 2:11",[["Jesus",24],["Savior",20],["Christ / Messiah",18],["Immanuel",15],["Lord",13],["Son of the Most High",10]]),
  board("b04","Bible","Name something angels did in the Christmas story.","Matthew 1–2; Luke 1–2",[["Said 'Do not fear'",22],["Announced the birth",20],["Praised God",18],["Gave a sign",16],["Declared peace",14],["Appeared in a dream",10]]),
  board("b05","Bible","Name someone who recognized, visited, or celebrated the promised Child.","Matthew 2; Luke 2",[["Shepherds",25],["Magi",23],["Mary and Joseph",18],["Simeon",14],["Anna",12],["Angels",8]]),
  board("b06","Bible","Name an event that happened after Jesus was born.","Matthew 2; Luke 2",[["Shepherds visited",24],["Circumcision and naming",18],["Temple presentation",18],["Magi visited",16],["Flight to Egypt",14],["Return to Nazareth",10]]),
  board("b07","Bible","Name a prophecy or Old Testament promise connected to the Messiah's birth.","Micah 5:2; Isaiah 7:14; 9:6; Numbers 24:17",[["Bethlehem ruler",24],["Virgin / Immanuel",22],["Child / Son given",18],["Star from Jacob",14],["Ruler from Judah",12],["Out of Egypt",10]]),
  board("b08","Bible","Name a tangible object in the biblical Christmas accounts.","Matthew 2; Luke 2",[["Manger",22],["Swaddling cloths",20],["Gold",18],["Frankincense",16],["Myrrh",14],["Temple offering",10]]),
  board("b09","Bible","Name a reason someone traveled in the Nativity story.","Matthew 2; Luke 1–2",[["Census",28],["Worship",23],["Escape danger",20],["Return home",12],["Temple presentation",10],["Visit Elizabeth",7]]),
  board("b10","Bible","Name a reaction someone had to the news of Jesus' birth.","Matthew 2; Luke 1–2",[["Mary pondered",20],["Shepherds glorified",18],["Magi rejoiced",18],["Herod was troubled",16],["Zechariah praised",14],["Simeon praised",14]]),
  board("b11","Bible","Name a heavenly sign or supernatural message in the Christmas story.","Matthew 1–2; Luke 1–2",[["Star",28],["Angel",25],["Glory of the Lord",20],["Dream",12],["Holy Spirit revelation",8],["Heavenly host",7]]),
  board("b12","Bible","Name a theme or word closely associated with the biblical Christmas story.","Luke 1–2; Matthew 2",[["Joy",20],["Peace",18],["Glory",18],["Good news",16],["Salvation",15],["Worship",13]]),
  board("h01","Holiday","Name something that disappears first at a Christmas potluck.","Holiday Hilarity",[["Cookies",26],["Dessert",24],["Rolls",18],["Dip",14],["Mac and cheese",10],["Anything chocolate",8]]),
  board("h02","Holiday","Name a reason someone is late to a holiday gathering.","Holiday Hilarity",[["Traffic",26],["Still wrapping gifts",22],["Kids not ready",18],["Cooking took too long",14],["Went to wrong house",12],["Could not find keys",8]]),
  board("h03","Holiday","Name something people pretend to love receiving.","Holiday Hilarity",[["Socks",24],["Fruitcake",20],["Ugly sweater",18],["Generic mug",14],["Scented candle",12],["Obvious regift",12]]),
  board("h04","Holiday","Name something likely to go wrong in a Christmas pageant.","Holiday Hilarity",[["Forgotten lines",24],["Costume mishap",20],["Toddler wanders",18],["Prop falls",16],["Music fails",12],["Animal steals scene",10]]),
  board("h05","Holiday","Name something relatives debate during holiday decorating.","Holiday Hilarity",[["Tree topper",24],["Light color",20],["Ornament placement",18],["Real or fake tree",16],["When to decorate",12],["Outdoor lights",10]]),
  board("h06","Holiday","Name something you hear after someone opens a mysterious gift.","Holiday Hilarity",[["What is it?",24],["Nervous thank you",20],["Laughter",18],["Who gave this?",14],["Awkward silence",12],["Can I exchange it?",12]]),
  board("h07","Holiday","Name something families do right before a holiday photo.","Holiday Hilarity",[["Fix hair",24],["Arrange everyone",20],["Argue",18],["Hide clutter",14],["Tell kids to smile",12],["Set the timer",12]]),
  board("h08","Holiday","Name something that makes gift wrapping harder.","Holiday Hilarity",[["Tape disappears",24],["Odd-shaped gift",20],["Paper is too short",18],["Pet sits on paper",14],["Scissors missing",12],["Child helper",12]]),
  board("h09","Holiday","Name a Christmas gift people secretly hope not to receive.","Holiday Hilarity",[["Fruitcake",24],["Socks",20],["Ugly sweater",18],["Generic mug",14],["Scented candle",12],["Obvious regift",12]]),
  board("h10","Holiday","Name something that causes holiday kitchen panic.","Holiday Hilarity",[["Burnt food",26],["Missing ingredient",20],["Oven is full",18],["Turkey still frozen",14],["Smoke alarm",12],["Dog steals food",10]]),
  board("h11","Holiday","Name evidence Santa might leave behind besides gifts.","Santa Special",[["Cookie crumbs",28],["Empty milk glass",20],["Boot prints",18],["Thank-you note",14],["Wrapping scraps",12],["Reindeer clues",8]]),
  board("h12","Holiday","Name something that could delay Santa's sleigh.","Santa Special",[["Rudolph takes wrong turn",24],["Reindeer snack break",20],["Tangled harness",18],["Bad weather",16],["Chimney traffic",12],["Missing gift bag",10]]),
  board("h13","Holiday","Name a funny or unexpected stocking stuffer.","Holiday Hilarity",[["Orange",24],["Toothbrush",20],["Batteries",18],["Lottery ticket",14],["Tiny toy",12],["Gift card",12]]),
  board("h14","Holiday","Name a family tradition before opening gifts.","Holiday Traditions",[["Special breakfast",24],["Pray",20],["Read Scripture",18],["Take photos",16],["Wake the family",12],["Make coffee",10]]),
  board("h15","Holiday","Name something a pet might do to the Christmas tree.","Holiday Hilarity",[["Knock down ornaments",26],["Climb the tree",22],["Chew the lights",18],["Sleep underneath",14],["Steal tinsel",12],["Bark at it",8]]),
  board("h16","Holiday","Name something someone says during Christmas movie night.","Holiday Hilarity",[["We have seen this before",24],["Who has the remote?",20],["The snacks are gone",18],["Pick another movie",14],["Someone fell asleep",12],["Is this a Christmas movie?",12]])
];

export const FAST_MONEY_BANK = [
  {q:"Name something in the Bethlehem night sky.",a:[["Star",35],["Angels",25],["Glory",20],["Moon",10],["Clouds",10]]},
  {q:"Name a gift people bring to a new baby.",a:[["Clothes",30],["Blanket",25],["Toy",20],["Money / card",15],["Diapers",10]]},
  {q:"Name a sound heard during a Christmas church service.",a:[["Hymns",30],["Bells",24],["Prayer",18],["Children",16],["Organ / piano",12]]},
  {q:"Name something worn in a Christmas pageant.",a:[["Angel wings",30],["Robe",24],["Crown",18],["Shepherd headcloth",16],["Animal costume",12]]},
  {q:"Name a Christmas morning tradition.",a:[["Pray",24],["Read Scripture",22],["Special breakfast",20],["Open gifts",18],["Take photos",16]]},
  {q:"Name something found in a Nativity display.",a:[["Manger",30],["Star",25],["Sheep",20],["Magi",15],["Angel",10]]},
  {q:"Name something forgotten on the way to a Christmas gathering.",a:[["Gift",30],["Food",24],["Phone / camera",18],["Card",14],["Family member",14]]},
  {q:"Name a word often heard in a Christmas hymn.",a:[["Joy",30],["Peace",24],["Glory",18],["Holy",16],["Angel",12]]},
  {q:"Name a holiday food usually served warm.",a:[["Cocoa",28],["Rolls",24],["Casserole",20],["Pie",16],["Cookies",12]]},
  {q:"Name something families do when the power goes out at Christmas.",a:[["Light candles",28],["Check fuse",24],["Sing",20],["Play games",16],["Panic",12]]},
  {q:"Name something Santa checks twice.",a:[["The list",40],["Gift labels",22],["Sleigh",16],["Route",12],["Reindeer",10]]},
  {q:"Name something people take to a holiday party.",a:[["Dessert",28],["Gift",24],["Drink",20],["Side dish",16],["Camera",12]]}
];

export const CHALLENGE_BANK = [
  {type:"Prophecy",q:"Which prophet named Bethlehem as the ruler's birthplace?",choices:["Micah","Isaiah","Hosea","Malachi"],answer:0,note:"Micah 5:2"},
  {type:"Prophecy",q:"Who spoke of a virgin and Immanuel?",choices:["Isaiah","Jeremiah","Joel","Amos"],answer:0,note:"Isaiah 7:14"},
  {type:"Prophecy",q:"Where is the star from Jacob pictured?",choices:["Numbers 24:17","Psalm 23","Micah 6:8","Isaiah 40:31"],answer:0,note:"Balaam's oracle in Numbers 24:17"},
  {type:"Who Said It",q:"‘Let us go to Bethlehem.’",choices:["The Magi","The shepherds","Mary","Joseph"],answer:1,note:"Luke 2:15"},
  {type:"Who Said It",q:"‘Now dismiss your servant in peace.’",choices:["Simeon","Zechariah","Joseph","Herod"],answer:0,note:"Luke 2:29"},
  {type:"Trivia",q:"What sign was given to the shepherds?",choices:["A crown","A baby in a manger","Three gifts","A scroll"],answer:1,note:"Luke 2:12"},
  {type:"Trivia",q:"How many Magi does Matthew specify?",choices:["Two","Three","Twelve","The number is not stated"],answer:3,note:"Matthew names three gifts, not the number of Magi."},
  {type:"Trivia",q:"Who recognized Jesus at the temple?",choices:["Simeon and Anna","The Magi","Herod","Zechariah and Elizabeth"],answer:0,note:"Luke 2:25–38"},
  {type:"Which Came First",q:"Which happened first?",choices:["Gabriel visited Zechariah","Gabriel visited Mary"],answer:0,note:"Luke 1:11–38"},
  {type:"Which Came First",q:"Which happened first?",choices:["Magi visited","Flight to Egypt"],answer:0,note:"Matthew 2:11–14"},
  {type:"Which Came First",q:"Which happened first?",choices:["Jesus was named","Temple presentation"],answer:0,note:"Luke 2:21–22"},
  {type:"Who Said It",q:"‘Where is the one born king of the Jews?’",choices:["Herod","The Magi","The shepherds","Simeon"],answer:1,note:"Matthew 2:2"}
];

export const shuffle = items => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
