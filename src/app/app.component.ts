import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  targetUrl: string = "";
  storyParts: any;
  finalparagraphToRead: string = '';
  readingloader: boolean = false;
  today = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  extractingLinkLoader: boolean = false;
  extractedLinks: { id: string; seasonNo: number; partNo: number, copied: boolean, link: string }[] = [];
  currentBookParagraphs: string[] = [];
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private http: HttpClient,private cdRef: ChangeDetectorRef) { }

  // Method to copy text to clipboard
  copyToClipboard(text: string, callback?: () => void): void {
    if (!text) {
      this.errorMessage = 'No text to copy';
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);

    // Select the text and execute the copy command
    textArea.select();
    
    try {
      document.execCommand('copy');
      if (callback) {
        callback();
      }
    } catch (err) {
      this.errorMessage = 'Failed to copy text to clipboard';
    } finally {
      // Remove the temporary textarea from the DOM
      document.body.removeChild(textArea);
    }
  }

  onCopyClick(textToCopy: string): void {
    this.copyToClipboard(textToCopy, () => {
      alert('Text copied to clipboard!');
    });
  }

  // Extract links from the story parts
  extractLinks(): string[] {
    if (!this.storyParts) {
      this.errorMessage = 'No story parts available to extract links';
      return [];
    }

    const links: string[] = [];
    
    try {
      // Get all anchor tags in the parsed document
      const anchorTags = this.storyParts.querySelectorAll('a');

      // Loop through each anchor tag and get the href attribute
      anchorTags.forEach((anchor: HTMLAnchorElement) => {
        if (anchor.href) {
          links.push(anchor.href);
        }
      });

    } catch (error) {
      this.errorMessage = 'Error extracting links from the content';
    }

    return links;
  }

  onExtractLinks(): void {
    this.finalparagraphToRead = '';
    this.errorMessage = '';
    
    const links = this.extractLinks();
    
    if (links.length === 0) {
      this.errorMessage = 'No links found to process';
      this.readingloader = false;
      return;
    }

    this.extractedLinks = this.convertUrlsToStoryObjects(links);
    
    if (this.extractedLinks.length > 0) {
      this.startReading();
    } else {
      this.errorMessage = 'No valid story links found';
      this.readingloader = false;
      this.extractingLinkLoader = false;
    }
  }

  convertUrlsToStoryObjects(urls: string[]): { id: string; seasonNo: number; partNo: number, copied: boolean, link: string }[] {
    const result: { id: string; seasonNo: number; partNo: number, copied: boolean, link: string }[] = [];
    
    urls.forEach(url => {
      try {
        // Step 1: Remove base URL and split by '-'
        const cleanUrl = url.replace('https://www.wattpad.com/', '').replace('http://www.wattpad.com/', '');
        const splitUrl = cleanUrl.split('-');

        // Step 2: Extract the ID (the first part)
        const id = splitUrl[0];
        
        // For Wattpad URLs, we need to extract season and part numbers properly
        let seasonNo = 1;
        let partNo = 1;

        // Look for patterns like "season-1-part-1" or similar
        for (let i = 0; i < splitUrl.length; i++) {
          if (splitUrl[i] === 'season' && splitUrl[i + 1]) {
            seasonNo = parseInt(splitUrl[i + 1]) || 1;
          }
          if (splitUrl[i] === 'part' && splitUrl[i + 1]) {
            partNo = parseInt(splitUrl[i + 1]) || 1;
          }
        }

        const copied = false;
        const link = `https://www.wattpad.com/apiv2/?m=storytext&id=${id}&page=${partNo}`;

        // Validate and push the result
        if (id) {
          result.push({ id, seasonNo, partNo, copied, link });
        }
      } catch (error) {
      }
    });

    return result;
  }

  removeHtmlTags(input: string): string {
    if (!input) return '';
    return input.replace(/<\/?[^>]+(>|$)/g, "");
  }

  getTextWithoutHtml(content: string): string {
    return this.removeHtmlTags(content);
  }


  startReading(): void {
    if (this.extractedLinks.length === 0) {
      this.errorMessage = 'No links available to read';
      this.readingloader = false;
      this.cdRef.detectChanges(); // Add this
      return;
    }

    this.http.post('https://kdeditor.onrender.com/api/getAllBooks', this.extractedLinks).subscribe({
      next: (response: any) => {
        this.readingloader = false;
        this.extractingLinkLoader = false;
        
        try {
          if (response && response.books) {
            const parsedData = response.books;
            
            // Ensure it's a string
            if (typeof parsedData === 'string') {
              this.finalparagraphToRead = parsedData;
            } else if (typeof parsedData === 'object') {
              this.finalparagraphToRead = JSON.stringify(parsedData);
            } else {
              this.finalparagraphToRead = String(parsedData);
            }
            
            
          } else {
            this.errorMessage = 'Invalid response format from server';
          }
        } catch (e) {
          this.errorMessage = 'Error processing the response data';
        }
        
        // Trigger change detection
        this.cdRef.detectChanges();
      },
      error: (error) => {
        this.readingloader = false;
        this.extractingLinkLoader = false;
        this.cdRef.detectChanges(); // Add this
        // ... error handling
      }
    });
  }

  async autoExtractOnIdle(): Promise<void> {
    // Validate input
    if (!this.targetUrl) {
      this.errorMessage = 'Please enter a valid URL';
      return;
    }

    if (!this.targetUrl.startsWith('http')) {
      this.errorMessage = 'Please enter a valid URL starting with http:// or https://';
      return;
    }

    // Reset states
    this.readingloader = true;
    this.extractingLinkLoader = true;
    this.errorMessage = '';
    this.finalparagraphToRead = '';
    this.extractedLinks = [];


    // Wait for browser to be idle
    if ('requestIdleCallback' in window) {
      return new Promise((resolve) => {
        (window as any).requestIdleCallback(() => {
          this.extractAndOpen();
          resolve();
        });
      });
    } else {
      // Fallback: wait for page load and short delay
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => this.extractAndOpen(), 1000);
        });
      } else {
        setTimeout(() => this.extractAndOpen(), 1000);
      }
    }
  }

  private async extractAndOpen(): Promise<void> {
    try {
      
      const html: any = await this.http.get(this.targetUrl, { 
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }).toPromise();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const ul: any = doc.querySelector('ul[aria-label="story-parts"]');

      if (ul) {
        this.storyParts = ul;
        this.onExtractLinks();

        // Copy the HTML content to clipboard
        try {
          const textArea = document.createElement('textarea');
          textArea.value = ul.outerHTML;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch (copyError) {
        }
      } else {
        this.errorMessage = 'No story parts found on this page. Please check if the URL is correct and contains story content.';
        this.readingloader = false;
        this.extractingLinkLoader = false;
      }
    } catch (error: any) {
      this.readingloader = false;
      this.extractingLinkLoader = false;
      
      if (error.status === 0) {
        this.errorMessage = 'Network error: Cannot fetch the URL. Please check your internet connection and CORS settings.';
      } else if (error.status === 404) {
        this.errorMessage = 'URL not found. Please check if the URL is correct.';
      } else if (error.status === 403) {
        this.errorMessage = 'Access forbidden. The website might be blocking requests.';
      } else {
        this.errorMessage = `Failed to load content: ${error.message || 'Unknown error'}`;
      }
    }
  }

  // Utility method to clear all data
  clearData(): void {
    this.targetUrl = '';
    this.finalparagraphToRead = '';
    this.extractedLinks = [];
    this.errorMessage = '';
    this.readingloader = false;
    this.extractingLinkLoader = false;
  }

  // Method to retry the last operation
  retry(): void {
    if (this.targetUrl) {
      this.autoExtractOnIdle();
    } else {
      this.errorMessage = 'No URL to retry';
    }
  }
}