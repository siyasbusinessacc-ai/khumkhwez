import { useEffect } from "react";
import { LegalLayout } from "@/components/LegalLayout";

const PrivacyPage = () => {
  useEffect(() => {
    document.title = "Privacy Policy | Maniac Lounge";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "How Maniac Lounge collects, uses and protects your personal information under POPIA.");
  }, []);

  return (
    <LegalLayout
      title="Maniac Lounge — Privacy Policy"
      updated="26 August 2026"
      intro={[
        "Maniac Lounge respects your privacy and is committed to handling your personal information responsibly.",
        "This Privacy Policy explains what information we may collect, why we collect it, how we use it, who may have access to it, and the rights you have regarding your information.",
        "By registering for, accessing or using the Maniac Lounge website, web application or meal services, you acknowledge that you have read and understood this Privacy Policy.",
      ]}
      sections={[
        {
          heading: "1. Information We Collect",
          paragraphs: ["Depending on how you use Maniac Lounge, we may collect information such as:"],
          bullets: [
            "Full name.",
            "Email address.",
            "Mobile phone number.",
            "Delivery address or other relevant location information.",
            "Account login information.",
            "Meal-plan and subscription information.",
            "Pickup and delivery information.",
            "QR codes or other account identifiers.",
            "Payment and transaction information.",
            "Communications between you and Maniac Lounge.",
            "Information you voluntarily provide through your account or when contacting us.",
            "Information necessary to verify your identity or eligibility to use the service.",
            "A profile photograph or other identification information where verification is required and the relevant information is provided or requested.",
          ],
        },
        {
          paragraphs: [
            "We aim to collect only information that is reasonably necessary for operating, securing and improving the Maniac Lounge service.",
          ],
        },
        {
          heading: "2. How We Use Your Information",
          paragraphs: ["We may use your personal information to:"],
          bullets: [
            "Create and manage your Maniac Lounge account.",
            "Confirm your identity and eligibility.",
            "Activate and manage your meal plan.",
            "Confirm meal entitlement.",
            "Generate and verify your QR code or other account credentials.",
            "Process payments and subscriptions.",
            "Arrange and manage meal collection or delivery.",
            "Contact you regarding your account, meals, payments or subscription.",
            "Notify you about important changes, interruptions or issues affecting the service.",
            "Respond to customer support requests.",
            "Prevent fraud, account sharing, misuse and unauthorised meal redemption.",
            "Investigate suspected abuse or security incidents.",
            "Maintain and improve the website and application.",
            "Keep appropriate business and transaction records.",
            "Comply with applicable legal or regulatory requirements.",
          ],
        },
        {
          heading: "3. Admin Access to Account Information",
          paragraphs: [
            "By registering for and using the Maniac Lounge application, you acknowledge that authorised Maniac Lounge administrators may access relevant information associated with your account where reasonably necessary to operate and support the service.",
            "This may include information such as your:",
          ],
          bullets: [
            "Name.",
            "Phone number.",
            "Email address.",
            "Delivery address.",
            "Meal-plan information.",
            "Account and transaction information.",
            "QR code or account identifier.",
            "Profile photograph or verification information where applicable.",
            "Communications with Maniac Lounge.",
          ],
        },
        {
          paragraphs: [
            "This access allows authorised administrators to perform legitimate operational functions such as confirming a customer's identity, verifying meal entitlement, arranging delivery, resolving account problems, responding to support requests, investigating suspected misuse, or contacting a customer about an important matter relating to their service.",
            "Administrator access is intended for legitimate business and service-related purposes and does not mean that every administrator may freely access every piece of information for any purpose.",
          ],
        },
        {
          heading: "4. Identity and Account Verification",
          paragraphs: [
            "For security and fraud-prevention purposes, Maniac Lounge may need to verify that an account belongs to the person attempting to use it.",
            "Depending on the circumstances, verification may involve information such as:",
          ],
          bullets: [
            "A profile photograph.",
            "Identification information.",
            "Account information.",
            "A QR code.",
            "Contact details.",
            "Other reasonable verification methods.",
          ],
        },
        {
          paragraphs: [
            "Where a photograph or other information is used for identity verification, it will be used for the relevant verification and security purposes and handled in accordance with applicable privacy laws.",
            "Where verification involves biometric information or other information receiving special protection under applicable law, Maniac Lounge will only process such information where there is an appropriate lawful basis to do so.",
          ],
        },
        {
          heading: "5. Communications",
          paragraphs: [
            "We may contact you using the contact details associated with your account when reasonably necessary to provide or manage the service.",
            "This may include communications regarding:",
          ],
          bullets: [
            "Meal availability.",
            "Pickup or delivery.",
            "Payment problems.",
            "Subscription status.",
            "Account verification.",
            "Important service changes.",
            "Security issues.",
            "Changes affecting your meal plan.",
            "Customer support matters.",
            "Other information that is directly relevant to your use of Maniac Lounge.",
          ],
        },
        {
          paragraphs: ["These service-related communications are different from optional promotional marketing."],
        },
        {
          heading: "6. Payment Information",
          paragraphs: [
            "Payments may be processed by third-party payment providers.",
            "Where a third-party payment provider processes your payment, Maniac Lounge generally does not receive or store your full card number or card security information.",
            "We may receive information necessary to identify and reconcile the transaction, such as payment status, transaction reference, amount and relevant account information.",
            "Third-party payment providers may process information according to their own privacy policies and terms.",
          ],
        },
        {
          heading: "7. Delivery Information",
          paragraphs: [
            "If you use a delivery service, we may provide the delivery information reasonably necessary for the delivery to be completed.",
            "This may include your name, phone number, delivery address and relevant delivery instructions.",
            "Where a third-party delivery provider is used, that provider may process the information necessary to perform the delivery.",
          ],
        },
        {
          heading: "8. Service Providers and Third Parties",
          paragraphs: ["Maniac Lounge may use trusted third-party providers to operate the service.", "These may include providers for:"],
          bullets: [
            "Payment processing.",
            "Website and application hosting.",
            "Authentication.",
            "Database and cloud storage.",
            "Delivery.",
            "Messaging and communications.",
            "Security and fraud prevention.",
            "Technical maintenance.",
          ],
        },
        {
          paragraphs: [
            "We will seek to ensure that information shared with service providers is relevant to the service they are providing and handled appropriately.",
          ],
        },
        {
          heading: "9. Information Security",
          paragraphs: [
            "We take reasonable technical and organisational measures to protect personal information against unauthorised access, loss, misuse, alteration or disclosure.",
            "However, no internet-based service can guarantee absolute security.",
            "Customers are responsible for keeping their passwords, login credentials and devices secure and should notify us if they believe their account has been compromised.",
          ],
        },
        {
          heading: "10. Retention of Information",
          paragraphs: [
            "We retain personal information for as long as reasonably necessary for the purposes for which it was collected, including providing the service, maintaining business records, resolving disputes, preventing fraud and complying with legal or regulatory obligations.",
            "When information is no longer reasonably required, we will take reasonable steps to delete, destroy or de-identify it where appropriate.",
          ],
        },
        {
          heading: "11. Information You Provide About Other People",
          paragraphs: [
            "You should only provide another person's personal information to Maniac Lounge where you are authorised to provide it or where you have the appropriate permission.",
            "For example, if you provide another person's contact or delivery information, you should ensure that doing so is lawful.",
          ],
        },
        {
          heading: "12. Customer Rights",
          paragraphs: ["Subject to applicable law, you may have rights relating to your personal information, including the right to:"],
          bullets: [
            "Request access to personal information we hold about you.",
            "Request correction of inaccurate or outdated information.",
            "Object to certain forms of processing.",
            "Request deletion where applicable.",
            "Withdraw consent where processing is based on consent, subject to legal and operational requirements.",
            "Raise a complaint regarding the handling of your personal information.",
          ],
        },
        {
          paragraphs: [
            "The Information Regulator of South Africa oversees POPIA and provides mechanisms for privacy-related complaints.",
          ],
        },
        {
          heading: "13. Marketing Communications",
          paragraphs: [
            "Maniac Lounge may send service-related communications that are necessary for operating your account.",
            "Where we send optional direct marketing communications, we will comply with applicable legal requirements and provide appropriate mechanisms for managing marketing preferences.",
          ],
        },
        {
          heading: "14. Cookies and Technical Information",
          paragraphs: [
            "The website and application may use cookies, local storage, device information, logs or similar technical technologies to maintain sessions, remember preferences, provide security, understand usage and operate the service.",
            "Technical information may include information such as browser type, device information, IP address and application activity where reasonably necessary for these purposes.",
          ],
        },
        {
          heading: "15. Changes to This Privacy Policy",
          paragraphs: [
            "We may update this Privacy Policy from time to time to reflect changes to our services, technology, legal requirements or data-processing practices.",
            "The latest version will be made available on the Maniac Lounge website.",
            "Where required by law, we will provide appropriate notice of material changes.",
          ],
        },
        {
          heading: "16. South African Law",
          paragraphs: [
            "Maniac Lounge intends to process personal information in accordance with applicable South African privacy legislation, including the Protection of Personal Information Act 4 of 2013 (POPIA).",
            "Nothing in this Privacy Policy is intended to remove or restrict any privacy right that cannot legally be excluded.",
          ],
        },
        {
          heading: "17. Contact",
          paragraphs: [
            "If you have questions about this Privacy Policy or wish to exercise an applicable privacy right, contact Maniac Lounge using the contact details published on our website.",
            "Maniac Lounge — Website: maniaclounge.co.za",
            "Physical address: 34 Beit Street, New Doornfontein, Johannesburg",
            "By registering for, accessing or using the Maniac Lounge application or services, you acknowledge that you have had an opportunity to read this Privacy Policy and understand how your personal information may be processed for the purposes described above.",
          ],
        },
      ]}
    />
  );
};

export default PrivacyPage;
