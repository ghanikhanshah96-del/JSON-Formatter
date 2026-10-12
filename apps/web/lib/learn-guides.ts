export type BlogContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }
  | { type: "code"; code: string; language: "json" | "javascript" | "text" }
  | { type: "list"; items: string[]; ordered?: boolean };

export type BlogPost = {
  slug: string;
  title: string;
  metaTitle?: string;
  description: string;
  eyebrow: string;
  relatedTools: string[];
  readMinutes: number;
  image: string;
  imageAlt: string;
  intro: string[];
  sections: { heading: string; blocks: BlogContentBlock[] }[];
};

/** @deprecated Prefer BlogPost */
export type LearnGuide = BlogPost;

export const BLOG_PAGE_SIZE = 9;

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-create-json-file",
    title: "How to Create JSON File: A Simple Step-by-Step Guide",
    metaTitle: "How to Create JSON File: Easy Step-by-Step Guide",
    description:
      "Learn how to create JSON files using Notepad or a code editor. Explore JSON syntax, examples, saving methods, and tips to check and format JSON files.",
    eyebrow: "JSON · BEGINNER GUIDE",
    relatedTools: ["json-formatter", "json-validator"],
    readMinutes: 12,
    image: "/blog/how-to-create-json-file.png",
    imageAlt: "Illustration showing a JSON file, text editor, validation, and saving with a .json extension",
    intro: [
      "JSON files are commonly used to store structured information for websites, applications, APIs, and software configurations. If you have ever worked with data from an API or needed to save settings for an application, you may have come across a file ending in .json.",
      "The good news is that you do not need special software to create one. A simple text editor is enough to get started. You just need to understand the basic JSON syntax, organize your data correctly, and save the file with the right extension.",
      "In this guide, you will learn how to create a JSON file from scratch, write a valid JSON object, save it on your computer, and check it for common syntax errors."
    ],
    sections: [
      {
        heading: "What Is a JSON File?",
        blocks: [
          { type: "paragraph", text: "JSON stands for JavaScript Object Notation. It is a text-based format that organizes information into a structure that both people and computer programs can understand." },
          { type: "paragraph", text: "A JSON file usually contains key-value pairs, arrays, or nested objects. For example, a website might use JSON to store product details, user preferences, application settings, or information returned by an API." },
          { type: "paragraph", text: "Here is a simple JSON file example:" },
          { type: "code", language: "json", code: `{
  "name": "Alex",
  "age": 25,
  "city": "London",
  "isActive": true
}` },
          { type: "paragraph", text: "In this example, name, age, city, and isActive are keys. Each key has a corresponding value. Text values use double quotes, while numbers and Boolean values such as true do not." },
          { type: "paragraph", text: "A JSON file is plain text, so you can create and edit it with a text editor without needing a database or specialized file editor." }
        ]
      },
      {
        heading: "How to Create JSON File Using a Text Editor",
        blocks: [
          { type: "paragraph", text: "One of the easiest ways to create a JSON file is to write the data manually in a plain text editor. You can use Notepad on Windows, TextEdit in plain-text mode on macOS, or a code editor such as Visual Studio Code." },
          { type: "paragraph", text: "Follow these steps to create your first file." },
          { type: "subheading", text: "Step 1: Open a Text Editor" },
          { type: "paragraph", text: "Open a plain text editor on your computer. For example, Windows users can launch Notepad, while macOS users can use TextEdit with plain-text mode enabled." },
          { type: "paragraph", text: "If you are working with JSON regularly, Visual Studio Code or another code editor can make the process easier by highlighting syntax and helping you spot mistakes." },
          { type: "paragraph", text: "Avoid using a rich-text document format because it may add formatting that is not valid JSON." },
          { type: "subheading", text: "Step 2: Write Your JSON Data" },
          { type: "paragraph", text: "Start with an opening curly brace { if you want to create a JSON object. Add a key and its value, separate them with a colon, and place a comma between properties." },
          { type: "paragraph", text: "For example, you could create a file containing basic product information:" },
          { type: "code", language: "json", code: `{
  "product": "Keyboard",
  "price": 49.99,
  "available": true,
  "category": "Accessories"
}` },
          { type: "paragraph", text: "This example contains a product name, a price, an availability status, and a category. You can replace these values with the information you need to store." },
          { type: "paragraph", text: "Make sure every opening brace has a matching closing brace and that every text key is enclosed in double quotes." },
          { type: "subheading", text: "Step 3: Save the File With a .json Extension" },
          { type: "paragraph", text: "Once your data is ready, save it as a JSON file." },
          { type: "paragraph", text: "In Notepad, select File → Save As. Enter a filename such as product.json. If the editor offers a file type option, choose All Files and ensure the filename ends with .json." },
          { type: "paragraph", text: "For example:" },
          { type: "code", language: "text", code: "product.json" },
          { type: "paragraph", text: "Choose a folder where you can easily find the file later, such as your Desktop or Documents folder, and save it." },
          { type: "paragraph", text: "Be careful that the editor does not silently add a .txt extension. A file named product.json.txt is not the same as product.json." },
          { type: "subheading", text: "Step 4: Check the Saved File" },
          { type: "paragraph", text: "Open the saved file in your text editor and confirm that the content looks correct. You can also use a JSON formatting tool to make the structure easier to read and spot possible syntax issues." },
          { type: "paragraph", text: "If you want to organize your JSON data online, try the CodeFormatterTools JSON Formatter. Paste your JSON into the tool to view it with cleaner indentation." },
          { type: "paragraph", text: "Remember that formatting improves readability, while validation checks whether the JSON follows the required syntax." }
        ]
      },
      {
        heading: "How to Create JSON File in Visual Studio Code",
        blocks: [
          { type: "paragraph", text: "Visual Studio Code is another convenient option, especially if you work with configuration files, APIs, or programming projects." },
          { type: "paragraph", text: "Here is how to make a JSON file in VS Code:" },
          { type: "list", ordered: true, items: ["Open Visual Studio Code.", "Create a new file using the File menu.", "Enter your JSON data.", "Save the file with a .json extension, such as settings.json.", "Review any syntax warnings displayed by the editor."] },
          { type: "paragraph", text: "VS Code recognizes the JSON file extension and can highlight keys, strings, numbers, and other values. This makes it easier to read nested structures and notice missing commas or quotation marks." },
          { type: "paragraph", text: "For a small file, a basic text editor is perfectly fine. A code editor becomes more useful as your JSON documents grow in size or complexity." }
        ]
      },
      {
        heading: "Understanding Basic JSON Syntax",
        blocks: [
          { type: "paragraph", text: "Before creating larger files, it helps to understand the rules that make JSON valid. A file can look organized but still contain a syntax error that prevents an application from reading it." },
          { type: "subheading", text: "Use Double Quotes for Keys and Text Values" },
          { type: "paragraph", text: "JSON requires double quotes around property names and string values." },
          { type: "paragraph", text: "Valid JSON:" },
          { type: "code", language: "json", code: `{
  "username": "alex123"
}` },
          { type: "paragraph", text: "Invalid JSON:" },
          { type: "code", language: "json", code: `{
  'username': 'alex123'
}` },
          { type: "paragraph", text: "The second example uses single quotes, which are not allowed for JSON strings." },
          { type: "subheading", text: "Separate Properties With Commas" },
          { type: "paragraph", text: "When an object contains multiple properties, place a comma between them. Do not add a comma after the final property." },
          { type: "paragraph", text: "Valid JSON:" },
          { type: "code", language: "json", code: `{
  "name": "Alex",
  "role": "Developer"
}` },
          { type: "paragraph", text: "Invalid JSON:" },
          { type: "code", language: "json", code: `{
  "name": "Alex",
  "role": "Developer",
}` },
          { type: "paragraph", text: "The trailing comma after the last property makes the second example invalid JSON." },
          { type: "subheading", text: "Understand Objects and Arrays" },
          { type: "paragraph", text: "Curly braces {} represent an object, while square brackets [] represent an array." },
          { type: "paragraph", text: "An object stores related properties:" },
          { type: "code", language: "json", code: `{
  "name": "Alex",
  "age": 25
}` },
          { type: "paragraph", text: "An array stores an ordered list of values:" },
          { type: "code", language: "json", code: `{
  "skills": ["HTML", "CSS", "JavaScript"]
}` },
          { type: "paragraph", text: "You can also combine arrays and objects to represent more detailed information." },
          { type: "subheading", text: "Use the Correct Value Types" },
          { type: "paragraph", text: "JSON supports strings, numbers, Boolean values, objects, arrays, and null." },
          { type: "code", language: "json", code: `{
  "name": "Alex",
  "age": 25,
  "isActive": true,
  "middleName": null,
  "skills": ["HTML", "CSS"]
}` },
          { type: "paragraph", text: "Text uses double quotes, but numbers, true, false, and null do not. Writing these values correctly helps applications interpret your data as intended." }
        ]
      },
      {
        heading: "How to Create a JSON File With Nested Data",
        blocks: [
          { type: "paragraph", text: "Sometimes, a single list of properties is not enough. You may need to group information into smaller sections. JSON allows you to place objects inside other objects and arrays." },
          { type: "paragraph", text: "For example, a customer record could look like this:" },
          { type: "code", language: "json", code: `{
  "customer": {
    "name": "Sarah",
    "email": "sarah@example.com"
  },
  "orders": [
    {
      "orderId": 101,
      "status": "shipped"
    },
    {
      "orderId": 102,
      "status": "processing"
    }
  ]
}` },
          { type: "paragraph", text: "This structure stores customer details alongside a list of orders. Each order is an object inside the orders array." },
          { type: "paragraph", text: "When creating nested JSON, check that every opening brace and bracket has a matching closing character. Indenting each level consistently also makes the file much easier to understand." }
        ]
      },
      {
        heading: "How to Create JSON File Programmatically",
        blocks: [
          { type: "paragraph", text: "If you need to generate JSON repeatedly, writing every file manually may not be practical. In JavaScript, you can convert an object into a JSON string using the built-in JSON.stringify() method." },
          { type: "paragraph", text: "For example:" },
          { type: "code", language: "javascript", code: `const user = {
  name: "Alex",
  age: 25,
  active: true
};

const jsonData = JSON.stringify(user, null, 2);

console.log(jsonData);` },
          { type: "paragraph", text: "The second argument, null, means no custom filtering function is used. The third argument, 2, adds two spaces of indentation to make the output readable." },
          { type: "paragraph", text: "This code creates a JSON-formatted string and prints it to the console. It does not automatically save a file to your computer. To create a downloadable file or write to disk, you need an additional step appropriate to your environment, such as using a browser download or a server-side file system API." },
          { type: "paragraph", text: "Programmatic generation is helpful when the data comes from an application, database, or API and changes frequently." }
        ]
      },
      {
        heading: "How to Validate and Format a JSON File",
        blocks: [
          { type: "paragraph", text: "After creating a file, check that it follows JSON syntax before using it in a project. A missing comma, mismatched bracket, or incorrectly quoted string can stop a program from parsing the data." },
          { type: "paragraph", text: "A practical workflow is:" },
          { type: "list", ordered: true, items: ["Open the saved JSON file or copy its contents.", "Check that keys and string values use double quotes.", "Look for missing commas and unmatched braces or brackets.", "Paste the content into a JSON tool to inspect its structure.", "Correct any errors and test the file again."] },
          { type: "paragraph", text: "You can use the online JSON Formatter to organize your JSON into a readable structure. This is especially useful when the file contains nested objects or arrives as one long line." },
          { type: "paragraph", text: "Keep in mind that a formatter and a validator serve different purposes. A formatter improves the presentation of JSON, while a validator checks whether the syntax is valid. If your data contains sensitive information, review the tool's privacy practices before pasting it into any online service." }
        ]
      },
      {
        heading: "Common Mistakes When Creating JSON Files",
        blocks: [
          { type: "paragraph", text: "If a JSON file does not work as expected, check for these common problems." },
          { type: "list", items: ["Using single quotes: JSON strings and property names must use double quotes.", "Adding a trailing comma: Do not place a comma after the final item in an object or array.", "Forgetting a comma: Separate neighboring properties and array items with commas.", "Mismatching brackets: Every opening { or [ needs the appropriate closing character.", "Using an incorrect extension: Save the file as .json, not .txt or .json.txt.", "Writing comments: Standard JSON does not support comments such as // add user details.", "Using undefined values: JSON does not have an undefined value. Choose a supported value or omit the property."] },
          { type: "paragraph", text: "Fixing these issues before using the file can save time when debugging an application or working with an API." }
        ]
      },
      {
        heading: "When Should You Use a JSON File?",
        blocks: [
          { type: "paragraph", text: "JSON is useful whenever structured information needs to be stored or exchanged between applications." },
          { type: "paragraph", text: "Common examples include:" },
          { type: "list", items: ["Application settings: Store preferences, feature options, or configuration values.", "API data: Represent information sent between a client and a server.", "Website content: Organize product details, menus, or other structured content.", "Test data: Keep sample records for development and automated testing.", "Data exchange: Transfer structured information between systems that support JSON."] },
          { type: "paragraph", text: "The exact structure depends on the application using the file. A JSON file can be syntactically valid but still fail to work if its keys or values do not match what the application expects." }
        ]
      },
      {
        heading: "Frequently Asked Questions",
        blocks: [
          { type: "subheading", text: "Can I create a JSON file without coding?" },
          { type: "paragraph", text: "Yes. You can create a JSON file in a plain text editor by writing the data in the correct format and saving it with a .json extension. You do not need to write a program just to create a basic file." },
          { type: "subheading", text: "Can I create a JSON file in Notepad?" },
          { type: "paragraph", text: "Yes. Open Notepad, write valid JSON, and use Save As to save the file with a .json extension. Check the filename afterward to make sure Windows has not added .txt." },
          { type: "subheading", text: "How do I create a JSON file online?" },
          { type: "paragraph", text: "You can write JSON in an online editor or prepare the data in a text editor and then use an online tool to format or validate it. A formatter helps organize existing JSON; it does not necessarily create a complete data structure for you." },
          { type: "subheading", text: "How do I know if my JSON file is valid?" },
          { type: "paragraph", text: "Check the quotation marks, commas, braces, brackets, and value types. You can also use a JSON validator to identify syntax errors before using the file in an application." },
          { type: "subheading", text: "Is a JSON file the same as a JavaScript file?" },
          { type: "paragraph", text: "No. A JSON file stores data in a defined text format, while a JavaScript file contains executable JavaScript code. JSON resembles JavaScript object syntax, but it follows stricter rules and cannot contain functions or executable statements." },
          { type: "subheading", text: "Does a JSON file need an internet connection?" },
          { type: "paragraph", text: "No. You can create, edit, and save a JSON file locally on your computer. An internet connection is only needed if your workflow relies on an online service or the file is being exchanged with a remote application." }
        ]
      },
      {
        heading: "Final Thoughts",
        blocks: [
          { type: "paragraph", text: "Learning how to create a JSON file is straightforward once you understand its structure and basic syntax. Start with a plain text editor, add your data using valid key-value pairs, and save the result with a .json extension." },
          { type: "paragraph", text: "Before using the file in a project, check for common syntax mistakes and make sure its structure matches the requirements of the application. For easier reading, use the CodeFormatterTools JSON Formatter to organize your JSON data and review its structure." },
          { type: "paragraph", text: "With these basics in place, you can create simple configuration files, prepare API data, and build more complex JSON documents as your needs grow." }
        ]
      }
    ]
  }
];

/** @deprecated Prefer blogPosts */
export const learnGuides = blogPosts;

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

/** @deprecated Prefer getBlogPost */
export function getLearnGuide(slug: string): BlogPost | undefined {
  return getBlogPost(slug);
}
