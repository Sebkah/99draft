# TODO

## 🔧 Minor

- Review exporters
- Optimize page calculations (check offsets instead of reparsing)
- stop the reparsing of lines when it stabilizes
- make canvas higher DPI

## 🚀 Major

- correctly map cursor when align != left
- Implement styleManager - WIIIP
  - correclty measure text (central measuring tool in Text Parser) with styles
- Add partial rendering of pages

## 🐛 Bugs

- Fix insertion at the end of document
- Handle end of document globally
  - Check bounds handling in piece table

## ♻️ Refactors

- Separate Editor concerns: interaction vs. pure text handling logic
