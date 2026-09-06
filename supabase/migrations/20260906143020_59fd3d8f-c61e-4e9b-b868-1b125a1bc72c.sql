CREATE TABLE public.linkedin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL,
  text text NOT NULL,
  url text,
  time_ago text NOT NULL DEFAULT '',
  image text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.linkedin_posts TO authenticated;
GRANT ALL ON public.linkedin_posts TO service_role;

ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read LinkedIn posts"
ON public.linkedin_posts
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.linkedin_posts (position, text, url, time_ago, image) VALUES
(0, 'Alwain Vaughn & Co. is seeking $7.5 million for a proposed gated condo-hotel development in Jamaica. The company joined FasterCapital’s EquityPilot programme in July 2026. No equity or funding was exchanged through the programme. The immediate ask is tied to land acquisition and the start of construction. FasterCapital’s announcement also references a larger capital plan, including a proposed $150 million initial build round and up to $300 million in total investment. For a project at this stage, the diligence will come down to site control, approvals, development budget, phasing, projected ADR, occupancy, operating costs, and the service model. Full breakdown in Ventureble Pulse. #VentureblePulse #Jamaica #Hospitality #HotelsAndResorts #RealEstateDevelopment #CaribbeanDeals #InvestmentReadiness', 'https://www.linkedin.com/posts/ventureble_alwain-vaughn-co-seeks-75m-for-jamaica-activity-7492535255044808704-lVSU', '3w', 'https://media.licdn.com/dms/image/v2/D4E12AQH1jOKKKQR6ZA/article-cover_image-shrink_720_1280/B4EZ_qCjJpJQAQ-/0/1786337970315?e=2147483647&v=beta&t=Xc-rXDX5lqJetx1ThRoPjDlw_fMP3_O5CtlAIGL2IWo'),
(1, 'True mentorship isn''t just about business transactions; it is about the love of the game. In a recent conversation with Laurent Cochet, Alexander Gafoor BA, LL.B (hons), LEC, CAMLS, the founder of Ventureble, highlights how supporting startups often requires a shift from profit-driven mindsets to genuine altruism. Gafoor notes that guiding emerging businesses requires a committed, long-term approach to help them navigate complex industry traps: * Prioritizing mentorship for the sake of long-term growth. * Helping startups scale beyond regional borders. * Enabling founders to reach their full potential through guidance. It is inspiring to see leaders invest time simply to watch the ecosystem flourish and succeed. How do you define success when mentoring or supporting new talent in your own industry? #StartupMentorship #VentureCapital #CaribbeanBusiness #BusinessGrowth #Entrepreneurship #Leadership', NULL, '1mo', 'https://static.licdn.com/aero-v1/sc/h/bn39hirwzjqj18ej1fkz55671'),
(2, 'Pinnacle Group, Inc. Actuarial Resources has acquired Ordinance Holdings Limited, a Bermuda-based actuarial consulting firm serving insurers, reinsurers, captives, and segregated accounts companies. The transaction also includes renewal rights for clients of Grape Bay Actuarial Consulting Inc. in Canada. Ordinance adds Bermuda actuarial work across loss reserving reviews, captive feasibility, reinsurance pricing support, enterprise risk management, and regulatory compliance reporting. #Ventureble #VentureblePulse #Bermuda #Insurance #Reinsurance #Actuarial #CaribbeanDeals #MergersAndAcquisitions', 'https://www.linkedin.com/posts/ventureble_pinnacle-actuarial-acquires-bermuda-based-activity-7487230236561059840-uVTf', '1mo', 'https://media.licdn.com/dms/image/v2/D4E12AQGF-EBqmDbygA/article-cover_image-shrink_720_1280/B4EZ.f7NQCIgAQ-/0/1785094528687?e=2147483647&v=beta&t=-TYT1_sNmD7go4ciey08qSsFKJfZOT79_1G49tK68XE'),
(3, 'I was featured in the July 2026 issue of the Trinidad and Tobago Chamber of Industry and Commerce''s Contact magazine. My article, "The Capital Test: What Lenders and Investors Look For", examines five areas lenders and investors tend to scrutinise when assessing a business: financial credibility, use of funds, governance, concentration risk and valuation defensibility. A good business can still fail the capital test.', NULL, '1mo', 'https://media.licdn.com/dms/image/v2/C4E03AQGYQcbQXH4uKQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1662068291489?e=2147483647&v=beta&t=7-i_uwdw6OEsNtVOay9seRddRGzLlMIVXi2oHd9b9fg');