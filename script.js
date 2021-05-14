let p = require("puppeteer")
let fs = require("fs")
const {jsPDF} = require("jspdf")
const nodemailer = require('nodemailer'); // For sending mails

// Importing the credentials for gmail login and goodreads login
let secrets = fs.readFileSync("../secrets").toString()
let email = secrets.split("\n")[0].trim()
let password = secrets.split("\n")[1].trim()

//Segregating user input containing author name and recipient name
let recipient = process.argv[process.argv.length-1]
let authors = process.argv.slice(2, process.argv.length-1);
authors = authors.map(function(author){
    return author.replace('-', ' ');
})



let booksList = [];

(async function(){
    let browser= await p.launch({
        headless:false,
        defaultViewport:null,
        args: ["--start-maximized"],
        slowMo: 50,
    });
    
    let pages = await browser.pages();
    page=pages[0]

    await page.goto("https://www.goodreads.com/")
    await page.click("#signIn .gr-hyperlink")
    await page.waitForSelector("#user_email")
    await page.type("#user_email", email)
    await page.type("#user_password", password)
    await page.click(".gr-button.gr-button--large")
    await page.waitForSelector(".searchBox__icon--magnifyingGlass.gr-iconButton.searchBox__icon.searchBox__icon--navbar")
    
    for(let i=0 ; i<authors.length; i++){
        await page.type(".searchBox__input.searchBox__input--navbar",authors[i])
        await page.keyboard.press("Enter")
        await page.waitForNavigation()
        
        let getBooks= async function(){
            return await page.evaluate(async function(){
                return await new Promise(function(resolve,reject){
                    let titlesContainer = document.querySelectorAll(".bookTitle")
                    let ratingsContainer = document.querySelectorAll(".minirating")
                    let linksContainer = document.querySelectorAll(".bookTitle")
                    let ratings = []
                    let titles = []
                    let links = []
                    let url = window.location.href
                    for(let j=0; j<titlesContainer.length; ++j)
                    {   titles.push(titlesContainer[j].innerText.trim())
                        ratings.push(ratingsContainer[j].innerText.split(" ")[1])
                        links.push(url+linksContainer[j].getAttribute("href"))
                    }

                    let originalRatings = [...ratings]
                    ratings.sort()
                    ratings.reverse()
                    let sortedTitles = []
                    let sortedLinks = []

                    for(let j=0; j<ratings.length; ++j)
                    {
                        let idx = originalRatings.indexOf(ratings[j])
                        sortedTitles.push(titles[idx])
                        sortedLinks.push(links[idx])
                    }
                    let booksInfoObj = {
                        "titles": sortedTitles.slice(0,5),
                        "ratings": ratings.slice(0,5),
                        "links": sortedLinks.slice(0,5),
                    }
                    resolve(booksInfoObj)
            })
        })}
        getBooks().then(function(booksInfo){
            addBooks(page, booksInfo, authors[i])
            if(i==authors.length-1)
            {   generatePDF();
                //sendEmail();
                browser.close()
            }
        });
        
    }
})();

function addBooks(page, booksInfo, author)
{
    let obj = {}
    obj.author = author
    obj.booksTitle = booksInfo.titles
    obj.booksRating = booksInfo.ratings
    obj.booksLink = booksInfo.links
    booksList.push(obj)
}


function generatePDF()
{   
    var doc = new jsPDF();
    let flag=false
    doc.setFontSize(10)

    
    for(let i=0; i<booksList.length; ++i)
    {   doc.setFont('Helvetica','bold')
        doc.text(booksList[i].author, 10, 15)
        for(let j=0; j<booksList[i].booksTitle.length; ++j)
        {
            doc.setFont('Helvetica','normal')
            doc.setTextColor("blue")
            doc.textWithLink( booksList[i].booksTitle[j], 15, 10 + 15*(j+1), {url:booksList[i].booksLink[j]})
            doc.setTextColor("black")
            doc.text( "Rating:"+booksList[i].booksRating[j], 15, 15 + 15*(j+1))
            doc.text( "", 20, 17 + 15*(j+1))
        }
        if(i<booksList.length-1)
            doc.addPage() 
    }

    doc.save("myBookList.pdf");
}

function sendEmail() {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: email,
            pass: password
        }
    });

    const mailOptions = {
        from: email,
        to: recipient,
        subject: "Top Books by my favourite authors",
        text: "Hey there,\nI am sending you a list of books by my favourite authors. Hope you like them!",
        attachments: [{
            filename: 'myBookList.pdf',
            path: './myBookList.pdf',
            contentType: 'application/pdf'
          }],
    };

    // This is user defined Promise which will contain the result of the sendMail function accordingly 
    return new Promise(function (resolve, reject) {
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                reject(error);
            } else {
                resolve(info.response);
            }
        });
    });
}