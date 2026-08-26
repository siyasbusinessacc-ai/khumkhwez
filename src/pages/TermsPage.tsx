import { useEffect } from "react";
import { LegalLayout } from "@/components/LegalLayout";

const TermsPage = () => {
  useEffect(() => {
    document.title = "Terms & Conditions | Maniac Lounge";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Maniac Lounge Terms & Conditions for meal plans, payments, pickup, delivery and account use.");
  }, []);

  return (
    <LegalLayout
      title="Maniac Lounge — Terms & Conditions"
      updated="26 August 2026"
      intro={[
        "Welcome to Maniac Lounge. These Terms & Conditions govern your use of the Maniac Lounge website, web application, meal plans and related services.",
        "By purchasing a Maniac Lounge meal plan, registering for an account, or using our services, you agree to these Terms & Conditions.",
        "If you do not agree with these terms, please do not purchase or use the service.",
      ]}
      sections={[
        {
          heading: "1. About Maniac Lounge",
          paragraphs: [
            "Maniac Lounge provides meal-plan services that give eligible customers access to meals during the applicable period and according to the plan purchased.",
            "Meal plans may include weekday, weekend or full-month meal access, depending on the plan selected at checkout.",
            "Meals may be collected from the designated pickup location or delivered where delivery is available for the customer's area and the selected plan.",
            "Maniac Lounge may use independent kitchens, food suppliers, delivery providers or other service providers to fulfil the service.",
          ],
        },
        {
          heading: "2. Meal Plans",
          paragraphs: ["The available plans, prices, meal coverage and other applicable conditions are displayed on the website and/or at checkout.", "Unless otherwise stated:"],
          bullets: ["Weekday Pass: R700 per month.", "Weekend Pass: R350 per month.", "Full Lounge Pass: R1,000 per month."],
        },
        {
          paragraphs: [
            "A meal plan provides access to the meals and services specified for that particular plan. It does not constitute an unlimited restaurant tab or a cash-equivalent food allowance.",
            "Plans are personal and may not be transferred, resold or shared with another person unless Maniac Lounge expressly agrees otherwise.",
          ],
        },
        {
          heading: "3. Registration and Account Information",
          paragraphs: [
            "Customers are responsible for providing accurate and current information when registering.",
            "You are responsible for keeping your login credentials secure and must not knowingly allow another person to use your account.",
            "If we reasonably believe that an account or QR code is being misused, shared, duplicated, manipulated or used fraudulently, we may suspend access while the matter is investigated.",
            "We reserve the right to require reasonable verification of identity or entitlement before providing a meal.",
          ],
        },
        {
          heading: "4. Payments",
          paragraphs: [
            "Payment must be successfully completed before a paid meal plan becomes active, unless Maniac Lounge has expressly agreed to another arrangement.",
            "Where a plan is a recurring subscription, the customer authorises the applicable payment provider to process recurring payments according to the subscription terms presented at checkout.",
            "The customer is responsible for ensuring that the payment method remains valid and has sufficient funds.",
            "Failed payments may result in suspension of meal-plan access until the outstanding payment is successfully resolved.",
            "Maniac Lounge does not have access to or store customers' full card details where payment is processed through a third-party payment provider.",
          ],
        },
        {
          heading: "5. Subscription Renewal and Cancellation",
          paragraphs: [
            "Where recurring billing applies, the subscription will renew according to the billing interval shown at checkout unless cancelled.",
            "Customers may request cancellation of future renewals through the available cancellation process.",
            "Cancellation of a subscription prevents future charges but does not automatically create a refund for meals or services already used or for a billing period that has already commenced, except where a refund is required by applicable law or is otherwise expressly approved by Maniac Lounge.",
            "Where applicable, cancellation takes effect at the end of the already-paid period unless otherwise stated.",
          ],
        },
        {
          heading: "6. Refunds",
          paragraphs: [
            "Because meal services involve food preparation, purchasing and operational commitments, refunds are not automatically available simply because a customer changes their mind or does not use meals that were available to them.",
            "Where a meal was not supplied due to an error attributable to Maniac Lounge, customers should contact us promptly so that the matter can be investigated and an appropriate remedy can be provided.",
            "Depending on the circumstances, the remedy may include replacement of the affected meal, a credit, or a refund.",
            "Nothing in these Terms limits any refund, cancellation or other consumer right that cannot lawfully be excluded under applicable South African law.",
          ],
        },
        {
          heading: "7. Meal Availability and Substitutions",
          paragraphs: [
            "We aim to provide the meals advertised for each plan.",
            "However, ingredients and particular menu items may occasionally become unavailable due to supplier issues, stock shortages, operational problems, food-safety considerations or circumstances outside our reasonable control.",
            "Where necessary, Maniac Lounge may reasonably substitute a meal or ingredient with an alternative of comparable nature or value.",
            "We will make reasonable efforts to ensure that substitutions remain consistent with the nature of the meal plan.",
          ],
        },
        {
          heading: "8. Allergies and Dietary Requirements",
          paragraphs: [
            "Customers are responsible for informing Maniac Lounge of any relevant allergies, intolerances or dietary requirements before consuming a meal.",
            "Because meals may be prepared in kitchens where various ingredients are handled, we cannot guarantee an allergen-free environment unless we have expressly confirmed that a particular meal has been prepared under appropriate allergen-controlled conditions.",
            "Customers with severe allergies should exercise appropriate caution and contact us before purchasing or consuming meals.",
          ],
        },
        {
          heading: "9. Pickup",
          paragraphs: [
            "Where pickup is selected, customers must collect meals during the applicable pickup period communicated by Maniac Lounge.",
            "Customers may be required to present their QR code or other proof of entitlement.",
            "A meal may not be released where reasonable verification of entitlement cannot be completed.",
            "Customers are responsible for collecting meals within the applicable collection period.",
          ],
        },
        {
          heading: "10. Delivery",
          paragraphs: [
            "Where delivery is offered, delivery is subject to the customer's area, the availability of delivery services and the conditions of the applicable plan.",
            "Customers must provide accurate delivery information.",
            "Maniac Lounge cannot be held responsible for delays caused by incorrect customer information, the customer's unavailability, traffic, weather, road conditions, third-party delivery providers or other circumstances reasonably outside our control.",
            "Where a customer is unavailable to receive a delivery, additional delivery arrangements or charges may apply where reasonably necessary.",
          ],
        },
        {
          heading: "11. Food Safety and Consumption",
          paragraphs: [
            "Meals should be consumed or stored appropriately after collection or delivery.",
            "Customers are responsible for following reasonable food-storage and reheating instructions provided with meals.",
            "Once a meal has been collected by the customer or successfully delivered to the customer's nominated location, Maniac Lounge cannot be responsible for deterioration caused by improper storage, handling, reheating or consumption after delivery or collection.",
            "Nothing in this section excludes liability that cannot legally be excluded.",
          ],
        },
        {
          heading: "12. Service Interruptions",
          paragraphs: [
            "We will make reasonable efforts to provide the service consistently.",
            "However, temporary interruptions may occur because of circumstances including equipment failure, power outages, supplier problems, kitchen closures, staff shortages, delivery disruptions, severe weather, government restrictions, emergencies or other circumstances beyond our reasonable control.",
            "Where a significant interruption occurs, Maniac Lounge will make reasonable efforts to provide an appropriate solution, which may include replacement meals, credits, alternative arrangements or another reasonable remedy depending on the circumstances.",
          ],
        },
        {
          heading: "13. Student Intake and Capacity Limits",
          paragraphs: [
            "Maniac Lounge may limit the number of customers accepted into a particular meal plan or intake.",
            "Capacity limits may be necessary to ensure that the kitchen can maintain reasonable food quality, portion sizes, preparation times and service standards.",
            "Availability shown on the website may change as subscriptions are purchased.",
            "A customer has not secured a place until their registration and payment have been successfully completed and confirmed.",
          ],
        },
        {
          heading: "14. Misuse and Fraud",
          paragraphs: ["Customers must not:"],
          bullets: [
            "Share or duplicate QR codes.",
            "Allow another person to redeem meals using their account.",
            "Attempt to obtain meals without valid entitlement.",
            "Manipulate the application or payment process.",
            "Provide fraudulent or misleading information.",
            "Attempt to circumvent plan limits or redemption rules.",
            "Resell meal-plan access without written permission.",
          ],
        },
        {
          paragraphs: [
            "Where there is reasonable evidence of fraud, abuse or material misuse, Maniac Lounge may suspend or terminate the affected account and investigate the matter.",
            "Where appropriate, fraudulent activity may be reported to the relevant authorities or payment provider.",
            "Any action taken under this section remains subject to applicable law.",
          ],
        },
        {
          heading: "15. Account Suspension or Termination",
          paragraphs: ["We may suspend or terminate an account where reasonably necessary because of:"],
          bullets: [
            "Fraud or attempted fraud.",
            "Serious misuse of the service.",
            "Unauthorised sharing or resale of access.",
            "Abuse, threats or harassment of staff or service providers.",
            "Material breach of these Terms.",
            "Payment-related issues.",
          ],
        },
        {
          paragraphs: [
            "Where appropriate and reasonably possible, we will notify the customer and provide an opportunity to resolve the issue.",
            "Termination does not remove rights or obligations that arose before termination.",
          ],
        },
        {
          heading: "16. Website and Application",
          paragraphs: [
            "We aim to keep the website and web application available and accurate, but we do not guarantee that they will always be uninterrupted, error-free or available on every device or network.",
            "We may update, modify or temporarily suspend portions of the website or application where reasonably necessary for maintenance, security, improvements or operational reasons.",
          ],
        },
        {
          heading: "17. Intellectual Property",
          paragraphs: [
            "The Maniac Lounge name, branding and logos are owned by Maniac Lounge, and website content, graphics, software and other original materials are owned by or licensed to Galvamorphiq unless otherwise stated.",
            "Customers may use the website and application for their intended personal purpose but may not reproduce, copy, distribute, modify or commercially exploit our materials without permission.",
          ],
        },
        {
          heading: "18. Limitation of Liability",
          paragraphs: [
            "To the extent permitted by applicable law, Maniac Lounge will not be responsible for losses that are indirect, unforeseeable or unrelated to the reasonable provision of the service.",
            "We will not be responsible for losses caused by circumstances outside our reasonable control, including third-party service providers, payment processors, delivery providers, telecommunications networks, internet outages or events beyond our reasonable control.",
            "Nothing in these Terms excludes or limits liability where doing so would be unlawful, including liability that cannot legally be excluded under applicable South African consumer-protection law.",
          ],
        },
        {
          heading: "19. Third-Party Services",
          paragraphs: [
            "Maniac Lounge may rely on third-party providers for services including payment processing, hosting, authentication, delivery, messaging and other technical functions.",
            "Those providers may have their own terms and privacy policies.",
            "We will take reasonable steps to work with reputable service providers, but third-party services may occasionally experience interruptions or failures outside our control.",
          ],
        },
        {
          heading: "20. Changes to These Terms",
          paragraphs: [
            "We may update these Terms from time to time to reflect changes to our services, operations, legal requirements or technology.",
            "The latest version will be made available on the Maniac Lounge website.",
            "Changes will not remove rights that customers have already acquired where doing so would be unlawful.",
          ],
        },
        {
          heading: "21. Consumer Rights",
          paragraphs: [
            "These Terms are intended to operate in accordance with applicable South African law.",
            "Nothing in these Terms is intended to remove, restrict or waive any consumer right or protection that cannot legally be excluded or limited.",
            "Where there is a conflict between these Terms and a mandatory legal requirement, the applicable legal requirement will prevail.",
          ],
        },
        {
          heading: "22. Governing Law",
          paragraphs: [
            "These Terms are governed by the laws of the Republic of South Africa.",
            "Any dispute will be dealt with in accordance with applicable South African law and the appropriate dispute-resolution processes available to the parties.",
          ],
        },
        {
          heading: "23. Contact",
          paragraphs: [
            "For questions regarding meal plans, payments, cancellations, refunds or these Terms, customers can contact Maniac Lounge through the contact details published on the website.",
            "Maniac Lounge — Website: maniaclounge.co.za",
            "Physical address: 34 Beit Street, New Doornfontein, Johannesburg",
            "By purchasing a Maniac Lounge meal plan or using the Maniac Lounge service, you acknowledge that you have had an opportunity to read and understand these Terms & Conditions.",
          ],
        },
      ]}
    />
  );
};

export default TermsPage;
