import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  storyParts:string = ""
  finalparagraphToRead:string = ''
  readingloader:boolean = false
  extractingLinkLoader:boolean = false
  extractedLinks:{ id: string; seasonNo: number; partNo: number }[] = [];
  currentBookParagraphs: string[] = [];

  // Method to copy text to clipboard
  copyToClipboard(text: string, callback?: () => void): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);

    // Select the text and execute the copy command
    textArea.select();
    document.execCommand('copy');

    // Remove the temporary textarea from the DOM
    document.body.removeChild(textArea);

    // Execute callback if provided
    if (callback) {
      callback();
    }
  }

  onCopyClick(textToCopy:string): void {
    this.copyToClipboard(textToCopy, () => {
      console.log('Text copied to clipboard!');
      // You can replace this with any other action, like showing a toast or changing UI state
    });
  }

// Assuming storyParts contains the HTML string
extractLinks(): string[] {
  this.extractingLinkLoader = true
  const links: string[] = [];
  
  // Create a new DOMParser to parse the HTML string
  const parser = new DOMParser();
  const doc = parser.parseFromString(this.storyParts, 'text/html'); // Parse the HTML string
  
  // Get all anchor tags in the parsed document
  const anchorTags = doc.querySelectorAll('a');
  
  // Loop through each anchor tag and get the href attribute
  anchorTags.forEach((anchor: HTMLAnchorElement) => {
    links.push(anchor.href);
  });

  return links; // Return the array of links
}

  onExtractLinks() {
    const links = this.extractLinks();
    this.extractedLinks = this.convertUrlsToStoryObjects(links)
    this.extractingLinkLoader = !(this.extractedLinks.length > 0)
  }

  convertUrlsToStoryObjects(urls: string[]) {
    const result: { id: string; seasonNo: number; partNo: number }[] = [];
  
    urls.forEach(url => {
      // Step 1: Remove base URL and split by '-'
      const splitUrl = url.replace('https://www.wattpad.com/', '').split('-');
  
      // Step 2: Extract the ID (the first part) and the last two parts for season and part
      const id = splitUrl[0]; // The first element is the ID
      const seasonMatch = splitUrl[8]; // This might be a string or undefined
      const partMatch = splitUrl[10]; // This might also be a string or undefined
  
      // Step 3: Convert season and part to numbers, fallback to NaN if not a valid number
      const seasonNo = seasonMatch ? Number(seasonMatch) : NaN;
      const partNo = partMatch ? Number(partMatch) : NaN;
  
      // Step 4: Validate and push the result if all values are found
      if (id && !isNaN(seasonNo) && !isNaN(partNo)) {
        result.push({ id, seasonNo, partNo });
      }
    });
  
    return result;
  }

  removeHtmlTags(input: string): string {
    return input.replace(/<[^>]*>/g, ''); // Regular expression to remove all HTML tags
  }

  getTextWithoutHtml(content: string): string {
    return this.removeHtmlTags(content);
  }

  async startReading() {
  this.finalparagraphToRead = this.getTextWithoutHtml(this.finalparagraphToRead)
  }
}