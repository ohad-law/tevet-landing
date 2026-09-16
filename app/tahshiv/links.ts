/**
 * שבעת קישורי התשלום של "תחשיב חוסרים", לפי מדרגות ותק.
 *
 * נוצרו ידנית ב-UPAY ב-16/09/2026 ואומתו אחד אחד בדפדפן:
 * סכום, תיאור, עברית, אפשרות תשלומים, PCI ו-SSL.
 *
 * 🚨 המחיר הוא 297 ש"ח לכל שנת ותק, מחיר אחד בכל הערוצים,
 * בלי הנחת וובינר. ראה rule_tevet_price_list.
 *
 * ⚠️ הקישורים ארוכים כי זו הכתובת שה-UPAY מחזיר אחרי יצירה.
 * הסיומת "==" חייבת להישאר. בהעתקה ידנית היא נשברה פעמיים
 * ל-"equalequal", ואז הדף לא נטען.
 */
export type Tier = { years: number; price: number; url: string };

export const TIERS: Tier[] = [
  { years: 1, price: 297, url: "https://app.upay.co.il/API6/clientsecure/redirectpage.php?msg=YTRHUnRQZWhoSWZ6S2hDN2tDdjRLa29SSE9XUEMxZzJkREIyQ05iQ1lLR1RWaHNoVCtxTk42cXBGQ0ZLTVZGRGdONFM3dW5STDJiRzk3SXhvUHpzNCtXYzR3YkljRFdBNWYrNWNHclNQVElYa0thbDRIcUlIRFozMmYwRStMeFYxc0UxMkh5dHp0ajhGejlQY2IzSnBWMFhyRytteEpaa3JSVC9FNmtSY2l1Y1hiUStTMG10VFoxaGZHbWY3aFFQTCtVVDlsNnR4RGpnNmVNRkdCU2VLcEJNNkpValdheUpqb2Nkd3dhYmNMRmxkQ05FYVZrN3UwWGV1WkdwczEvRDZVbGZCSVR0cm5RN0JPSjlab09LM0E9PQ==" },
  { years: 2, price: 594, url: "https://app.upay.co.il/API6/clientsecure/redirectpage.php?msg=YTRHUnRQZWhoSWZ6S2hDN2tDdjRLcytaMXlSS2xPcGszaVNZTGdjYXhjeG1CWStHc092OTlHNXZTNWgzMWpKZ2t6YzM4MmpVSjJ3MTNCQldEWGtqSU1lN1NyRjl1U2wwbDNwSWovRXBmQ0FWek9mZWkrekVLVHFpTzRPb2ZJelBhQ2VDdmNEWkZGZnZiYlFOU3Y1R2dlWG55b05RQUsyL1lOMU5uYk1YY2VLT2h6NTNtZXN5Wk5xSWJwUUlpeVY0cS9oRmNBUjlGUk9HT0RTaHlJQXFCaXdDWnhrdVdsL2EzRndJazRFbXNlUk1VYXhvTkZjblFlYWQzT1Q2SldPU2RZd04wcVJFUlVzbkRwRDlhTXppRXc9PQ==" },
  { years: 3, price: 891, url: "https://app.upay.co.il/API6/clientsecure/redirectpage.php?msg=YTRHUnRQZWhoSWZ6S2hDN2tDdjRLc1dTS056OGZVbTJpSThWVFpUUFczdXIvMElQczF5Z0ZMcnFGRThXZ24wd2NvMGVWR0FOcHBFWm5LbWIycEZ1dUNJMG0rZHZPdmhCWE00RXBZWE9iclBPQkc0RDhWU1lVbWNTY2xiZUV1MDN4dStDTXJENitvUWdUbnFHbFBGQ1ZOSHh3RzhYYTRJYm1XSlFucHFXSnRFOC82c2F4MzRxNTR4K0VxZCs5NzhZbnJMYWk4U3NQSWlEeVZqa2FMVjdWb0h4cGwyUzNjTTFheVN3WDkrdmZnZWhKNXpxMTNCRlJQQ2FMbUs2cHVUTDJ6MkFNdmlhaVV6WjNzNjNGa0VEb1VGTEtDbERZaUROWlB3cmJHL0hRcVU9" },
  { years: 4, price: 1188, url: "https://app.upay.co.il/API6/clientsecure/redirectpage.php?msg=YTRHUnRQZWhoSWZ6S2hDN2tDdjRLc0htOCt6b2o2ZlVvVmFUaXRDNGhDM3hKRzNvSnVqaE5IbmRZSXFPbXk0SU5na2paOFBLWld2OERXbWlnczFPTnJEOWlreHdRVmJwK2pkeDJ3UXpZK21kWVd0ZU1FclJCbWIwZXU4V0REVHFHQlhHMUNNeUZORzc3dUg4TWJEbmlSM1NhQzlGYTVWN1RXcm5RYVYwS2NySnB0TE1nOWJGT2NrblYrUjJacEpBeVRRUXVlcVhOOHZJWmtwbERoTE5FMWtzdDNKU1A2OUNSeEhQVS9NRmlJWjU0NkV3VjZkZkIzOW84U2xnUXg2YnhRRG51ak5TYmhwQ3hNbTI4UXBTVy85VUhnL3N1dDdaOERsTjFlNUdJeEU9" },
  { years: 5, price: 1485, url: "https://app.upay.co.il/API6/clientsecure/redirectpage.php?msg=YTRHUnRQZWhoSWZ6S2hDN2tDdjRLcURPY2VaVnpkckpvQy93Wll2Vk1UVXgrOHFFZXVndEsyL3Vqa0VQUGVOaFRkUHBvR1pNYWVjdDJsa3J0UVBjSEpnY25lL2t1SmJGVU12VXYzRE53YXBGa3JTNkVqN3pCOGZBZlBMdWZtbmlEVGpHTnEycWxGQmlFM2UwMGxwdktYbFhMdENLQVRrQmxtaGYzbFcwQS9iU1hWUldBcy8xUTRsN2oxQ3d6RmpGdE4rWlZmblBxbHNoalQyMit3WWFpaTFsVlFQTHZyemIwQTlNVmNXUi9tVm1wc2JNMkVaZkF1enhBamVISi9WaW9DbUhBSmtpSU1FVHVEb294R2RzSFJpcmlNZjNPQVVSdUdlcDZJZEl0a2s9" },
  { years: 6, price: 1782, url: "https://app.upay.co.il/API6/clientsecure/redirectpage.php?msg=YTRHUnRQZWhoSWZ6S2hDN2tDdjRLbjRFd1lrWWswZHhtd3dlNTVPdlpsWkczOUU3QktUSGRxY0pzWGFPd3VFNDE0emxwRGU1R094K3Bzc2lmZW5ZWDRBTTdWRVhQMWJodmhIS3NGUGRDMnlZdFY2eWFmL0lLUXlTM0ZyejZsL1NIZGxMTnNkWEI3WnVublp1V053UlNqVUVlT0I3TFV4T09iK211UmdVMkgzek8yRmNOY05VeEo4L1ZtZUZ0dDI4SjNwV2YxdjBaMFBDeFVYMkJ5cXc3aXdxcFVNOHR5YStjK2xSZHM1djlOd0pZNE1aWFhzeWNPMlJCQmsvSUlBUHc3QS8zcG1CYkZQaUwrMUZ0VzY4R1cyRDU1VVpWTS9wbGVGZC95V1hzT1U9" },
  { years: 7, price: 2079, url: "https://app.upay.co.il/API6/clientsecure/redirectpage.php?msg=YTRHUnRQZWhoSWZ6S2hDN2tDdjRLaGJZQWtzMVhCRmhMN1Z2Y25mdmlKT1MrRTh1WUZqOStyelAzWjE0TnUwdi9iemtMNkR3K241bEo3UVRXaWgvMXZRdWtsYTVoMFNCbXJ6V1d5dGw3R2NNZHhQdTZGVktTQnJoRWtncXB0c3dKenJIYWh1d01IeUJOQ1grNzkvVWpyMi93QlFUSE02dmxVSFcxT1hmRlJYNVlLNWpsaWcxV0xUNmV5STFhQ1ZUM2g5TkFNM1lveGVQajhiL3dWRExJQ0QxWlY3N1JNMmlPZjFZMlp4SHlZUVBzano0My83UGRSa0RjcC9Xcks0UEZlMWpteGNIaEFIOUNxTUg4ZThaQlRPMHc3Um9rMHhkeUJwMnU3YmtpaU09" },
];
