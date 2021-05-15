# Book-Recommender
An automated script to generate book list for given authors

The Book recommender that will take name of your favorite authors and will generate a file containing top 5 books by that author based on rating on "goodreads.com". 

Automation and web scraping are applied using puppeteer in this project. The script takes basically takes 2 inputs: one list of the author names and second is the recipient email address to whom the generated pdf will be sent. The script will automatically login into the goodreads account and search for the author. After that the script will extract top 5 books from there based on ratings. All the results are then compiled into a PDF file generated using jsPDF and after that it is sent to the recipient using the nodemailer.
