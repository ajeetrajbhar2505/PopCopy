import { Component, ElementRef, ViewChild } from '@angular/core';
type ApiResponse = any;
type Book = { id: string; seasonNo: number; partNo: number };

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  textToCopy: string = '';
  storyParts:string = ""
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

  onCopyClick(): void {
    this.copyToClipboard(this.textToCopy, () => {
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
  async startReading() {
    this.readingloader = true;
  
    for (const book of this.extractedLinks) {
      let hasNextPart = true;
      let partNo = book.partNo;
  
      while (hasNextPart) {
        try {
          // Call API to fetch the book's part data
          const response = await this.fetchBookPart(book.id, partNo); // Now calling dynamically based on `id` and `partNo`
  
          if (this.isEmptyResponse(response)) {
            console.log(`No data found for ${book.id} part ${partNo}, moving to next book...`);
            break; // Exit the current book loop if no data for this part
          } else {
            console.log(`Successfully fetched data for ${book.id} part ${partNo}`);
            this.currentBookParagraphs.push(response.data); // Add the valid content to current book's paragraphs
            partNo += 1; // Move to next part
          }
        } catch (error) {
          console.error(`Error fetching ${book.id} part ${partNo}:`, error);
          break; // Exit the part loop on error
        }
      }
  
      // After processing all parts for this book, aggregate them into the 'paragraphs' key.
      if (this.currentBookParagraphs.length > 0) {
        const bookContent = {
          id: book.id,
          paragraphs: this.currentBookParagraphs.join("\n\n") // Join all parts into a single string with line breaks.
        };
        console.log('Final aggregated content for book:', bookContent);
      } else {
        console.log(`No valid parts found for ${book.id}`);
      }
    }
  
    this.readingloader = false;
    console.log({currentBookParagraphs: this.currentBookParagraphs});
  }
  
  // Updated API call to handle dynamic `id` and `page` parameters
  async fetchBookPart(id: string, partNo: number): Promise<ApiResponse> {
    const url = `https://www.wattpad.com/apiv2/?m=storytext&id=${id}&page=${partNo}`;
  
    try {
      const response = await fetch(url, {
        method: 'GET', // Use GET for fetching data
        headers: {
          'authorization': 'IwKhVmNM7VXhnsVb0BabhS', // Add Authorization header
          'cookie': 'wp_id=aceb45e6-18ce-4cc3-87c0-711f119b0764; lang=1; te_session_id=1737901434186; _fbp=fb.1.1737901434595.448675768709933293; _col_uuid=ad5c9b87-1d05-4c8f-b63c-37b61683af36-3pjs; _gcl_au=1.1.1923979478.1737901435; _gid=GA1.2.2049016215.1737901435; locale=en_US; token=504850108%3A2%3A1737901510%3AIXtHsNbS5LytPTzR8t7o2-ZPKKl9J8Umspnyu1-EtnBsKGSPX5K8PbDyuFaG4eMk; nextUrl=https://www.wattpad.com/home; isStaff=1; ff=1; dpr=2; tz=-5.5; X-Time-Zone=Asia%2FCalcutta; _pbjs_userid_consent_data=3524755945110770; _pubcid=e0cb5f77-6b1f-4a8a-8ab4-6350d211973a; signupFrom=story_reading; AMP_TOKEN=%24NOT_FOUND; cto_bundle=9vI1Bl9MdDNtd2c3cDFaN1JidTJ3bnFTU2twUTFZMXdNSG5uRWpTcCUyQkFtQ3IlMkZnbzV3MEloOGZsSE1SNDcwYXR2cFNQNnZPMm5BRjZuOWhRbU1jZDYyYklxUmVXeUxtakl3eUN1ZzVMd3RXQnp2VkR2WmxaM3Q4R2s0VDRGbnl0NVczMFVibkVQUFBnTjdEcEJlaVhVUE1pQTNXUGZpaHl3RDVBdzMyalA2WTAyblJCQVVZeWVGWmFuanp3QXpMQWs1TWJw; cto_bidid=E2wDpF84R0V3NHlOZkJCMjRSMU5ETG9VbUozZEtlcHJselZLSjBMNnZlU0IlMkZiRElqbE1Gbm1wektFRXVYJTJCRmJpSXlMMTclMkIlMkZTdWNWVnBjY3dDaVlvMmdhR2JwUkxqNUhQcmpwTXhVYkZtZWd3dXFlTDlPRDRXSFVDelg2Um01WDlwWTlGQktEcGxmTWVLd1RpbGFGWEElMkY1ZHNBJTNEJTNE; TRINITY_USER_DATA=eyJ1c2VySWRUUyI6MTczNzkwOTUzMTEyN30=; TRINITY_USER_ID=1c7d3990-c0e3-4c6d-a88d-7c922cc964e2; _dd_s=logs=1&id=757b179b-dc98-4651-9f66-86ea52ac08e0&created=1737908845474&expire=1737910637596; RT=; _ga_FNDTZ0MZDQ=GS1.1.1737908845.2.1.1737909737.0.0.0; _ga=GA1.1.1272002089.1737901435' // Add Cookie header
        }
      });
  
      const data = await response.json();
      if (response.ok && data) {
        return { data: data.text }; // Assuming the response contains a `text` key with the content
      } else {
        return null; // In case of error or empty response
      }
    } catch (error) {
      console.error(`Error fetching data for ID: ${id}, Part: ${partNo}`, error);
      return null;
    }
  }
  
  
  // Helper method to determine if the response is empty
  isEmptyResponse(response: ApiResponse): boolean {
    return !response || !response.data || response.data.length === 0;
  }
  
  
  
}
