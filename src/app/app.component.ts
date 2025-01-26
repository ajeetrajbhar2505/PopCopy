import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  textToCopy: string = 'This is the text to be copied!';


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
}
