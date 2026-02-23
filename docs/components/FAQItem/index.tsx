interface FAQItemProps {
  question: string;
  answer: string;
}

export default function FAQItem({ question, answer }: FAQItemProps) {
  return (
    <details className="faq-item">
      <summary>{question}</summary>
      <div className="faq-content">{answer}</div>
    </details>
  );
}
