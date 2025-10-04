type ParagraphAlignChangeEvent = {
  paragraphIndex: number;
  align: 'left' | 'center' | 'right' | 'justify';
};

export interface ParagraphStylesManagerEvents {
  paragraphAlignChange: ParagraphAlignChangeEvent;
}
