import { useRoute, Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import {
  useGetZoningRecord,
  getGetZoningRecordQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ZONE_LABEL: Record<string, string> = {
  residential: "RESIDENTIAL ZONE",
  commercial: "COMMERCIAL ZONE",
  industrial: "INDUSTRIAL ZONE",
  agricultural: "AGRICULTURAL ZONE",
  institutional: "INSTITUTIONAL ZONE",
  protected_area: "PROTECTED AREA ZONE",
  mixed_use: "MIXED USE ZONE",
};

function fmtDate(d?: string | null) {
  if (!d) return "___________";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function fmtNum(n?: number | null) {
  if (n == null) return "";
  return Number(n).toLocaleString();
}

function Box({ label, value, wide }: { label?: string; value?: string; wide?: boolean }) {
  return (
    <div className={`border border-black p-1 min-h-[28px] ${wide ? "col-span-2" : ""}`}>
      {label && <div className="text-[8px] font-bold uppercase">{label}</div>}
      <div className="text-[10px]">{value ?? ""}</div>
    </div>
  );
}

function FormDivider({ label }: { label: string }) {
  return (
    <div className="col-span-4 bg-gray-200 border border-black text-center text-[9px] font-bold py-0.5 uppercase tracking-wide">
      {label}
    </div>
  );
}

export default function ZoningRecordFormView() {
  const [, params] = useRoute("/zoning-records/:id/form");
  const id = Number(params?.id);

  const { data: record, isLoading } = useGetZoningRecord(id, {
    query: { enabled: !!id, queryKey: getGetZoningRecordQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Record not found</p>
        <Link href="/zoning-records">
          <Button variant="outline">Back to Records</Button>
        </Link>
      </div>
    );
  }

  const appNo = record.reference_number;
  const decisionNo = record.reference_number;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-4 no-print">
        <Button asChild variant="outline" size="sm">
          <Link href={`/zoning-records/${record.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Record
          </Link>
        </Button>
        <h1 className="text-lg font-semibold flex-1">Generated Forms — {record.reference_number}</h1>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      <Tabs defaultValue="form1">
        <TabsList className="no-print">
          <TabsTrigger value="form1">Form 1 — Application</TabsTrigger>
          <TabsTrigger value="form2">Form 2 — Decision</TabsTrigger>
        </TabsList>

        {/* FORM 1 */}
        <TabsContent value="form1">
          <div className="printable-form">
          <div id="form1" className="bg-white text-black border border-gray-300 p-6 font-serif print:border-none print:shadow-none" style={{ fontFamily: "Times New Roman, serif" }}>
            {/* Header */}
            <div className="text-center mb-2">
              <p className="text-[9px]">Annex A HLURB Memo. Cr. No. 003 Series of 1985</p>
              <div className="flex justify-between items-start mt-1">
                <div className="text-left text-[9px] space-y-0.5 w-48">
                  <div className="flex gap-1"><span className="font-bold">Application No.:</span><span className="border-b border-black flex-1 min-w-[80px]">{appNo}</span></div>
                  <div className="flex gap-1"><span className="font-bold">Date Received:</span><span className="border-b border-black flex-1 min-w-[80px]">{fmtDate(record.created_at)}</span></div>
                  <div className="flex gap-1"><span className="font-bold">O.R. No.:</span><span className="border-b border-black flex-1 min-w-[80px]">{record.or_no ?? ""}</span></div>
                  <div className="flex gap-1"><span className="font-bold">Date of Payment:</span><span className="border-b border-black flex-1 min-w-[80px]">{fmtDate(record.date_of_payment)}</span></div>
                </div>
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold">Republic of the Philippines</p>
                  <p className="text-[9px] font-bold">Province of Surigao del Sur</p>
                  <p className="text-[9px] font-bold">Municipality of Tago</p>
                </div>
                <div className="text-right text-[8px] w-48">
                </div>
              </div>
            </div>

            <div className="border-t-2 border-b-2 border-black text-center py-1 my-2">
              <p className="text-[11px] font-bold tracking-wide">APPLICATION FOR LOCATIONAL CLEARANCE / CERTIFICATE OF ZONING COMPLIANCE</p>
            </div>

            {/* Grid form */}
            <div className="grid grid-cols-2 gap-0 text-[9px]">
              {/* Row 1: Applicant + Corporation */}
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">1. Name of Applicant (Last, First, Middle)</div>
                <div className="border-b border-black min-h-[18px]">{record.owner_name}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">2. Name of Corporation</div>
                <div className="border-b border-black min-h-[18px]">{record.corporation_name ?? ""}</div>
              </div>

              {/* Row 2: Address applicant + corporation */}
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">3. Address &amp; Tel. No. of Applicant</div>
                <div className="border-b border-black min-h-[18px]">{record.address}{record.owner_contact ? ` / Tel: ${record.owner_contact}` : ""}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">4. Address of Corporation</div>
                <div className="border-b border-black min-h-[18px]">{record.corporation_address ?? ""}</div>
              </div>

              {/* Row 3: Auth Rep */}
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">5. Name of Authorized Representative</div>
                <div className="border-b border-black min-h-[18px]">{record.authorized_rep_name ?? ""}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">6. Address of Authorized Representative</div>
                <div className="border-b border-black min-h-[18px]">{record.authorized_rep_address ?? ""}</div>
              </div>

              {/* Row 4: Project Type + Nature */}
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">7. Project Type</div>
                <div className="border-b border-black min-h-[18px]">{record.project_type ?? ""}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">8. Project Nature</div>
                <div className="border-b border-black min-h-[18px]">{record.project_nature ?? ""}</div>
              </div>

              {/* Row 5: Location + Scope */}
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">9. Project Location</div>
                <div className="border-b border-black min-h-[18px]">{record.barangay}{record.address ? `, ${record.address}` : ""}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">10. Project Scope <span className="font-normal">(In Square Meters)</span></div>
                <div className="flex gap-4">
                  <div><span className="font-bold">Lot Area:</span> <span>{record.land_area ? `${fmtNum(record.land_area)} sq.m.` : "_____ sq.m."}</span></div>
                  <div><span className="font-bold">Floor Area:</span> <span>{record.floor_area ? `${fmtNum(record.floor_area)} sq.m.` : "_____ sq.m."}</span></div>
                </div>
              </div>

              {/* Row 6: Right over land + Tenure + TCT */}
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">11. Right Over Land</div>
                <div className="border-b border-black min-h-[18px]">{record.right_over_land ?? ""}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold mb-0.5">12. Project Tenure</div>
                <div className="border-b border-black min-h-[18px]">{record.project_tenure ?? ""}</div>
              </div>

              <div className="border border-black p-1 col-span-2">
                <div className="font-bold mb-0.5">13. TCT/TDN</div>
                <div className="border-b border-black min-h-[18px]">{record.tct_tdn ?? ""}</div>
              </div>

              {/* Row 7: Zoning */}
              <div className="border border-black p-1 col-span-2">
                <div className="font-bold mb-0.5">14. Zoning / Land Use</div>
                <div className="border-b border-black min-h-[18px]">{ZONE_LABEL[record.zone_type] ?? record.zone_type.toUpperCase()}</div>
              </div>

              {/* Row 8: Project Cost */}
              <div className="border border-black p-1 col-span-2">
                <div className="font-bold mb-0.5">15. Project Cost / Capitalization (In Peso, write in words and figures)</div>
                <div className="border-b border-black min-h-[18px]">
                  {record.project_cost ? `${record.project_cost.toLocaleString("en-PH", { style: "currency", currency: "PHP" })} — ₱${fmtNum(record.project_cost)}` : ""}
                </div>
              </div>

              {/* Row 9: Mode of release */}
              <div className="border border-black p-1 col-span-2">
                <div className="font-bold mb-1">18. Preferred mode of release of decision:</div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-1">
                    <span className="border border-black w-3 h-3 flex items-center justify-center text-[8px]">{record.release_mode === "pickup" ? "✓" : ""}</span>
                    <span>Pick-up</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="border border-black w-3 h-3 flex items-center justify-center text-[8px]">{record.release_mode === "mail" ? "✓" : ""}</span>
                    <span>Mail</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Certification */}
            <div className="border border-black p-2 mt-1 grid grid-cols-2 gap-4 text-[8px]">
              <div>
                <div className="font-bold mb-1">19. Signature Over Printed Name of Applicant</div>
                <p>I hereby certify to the best of my knowledge, belief &amp; information that these are true &amp; correct statements I made &amp; I declare under the penalties of perjury if ever I made false statements, that this application has been in good faith verified by me.</p>
                <div className="mt-4 border-t border-black pt-1 text-center">{record.owner_name}<br /><span className="text-[7px]">Applicant</span></div>
              </div>
              <div>
                <div className="font-bold mb-1">19. Signature Over Printed Name of Authorized Representative</div>
                <p>I hereby certify to the best of my knowledge, belief &amp; information that these are true &amp; correct statements I made &amp; I declare under the penalties of perjury if ever I made false statements, that this application has been in good faith verified by me.</p>
                <div className="mt-4 border-t border-black pt-1 text-center">{record.authorized_rep_name ?? "___________________________"}<br /><span className="text-[7px]">Representative</span></div>
              </div>
            </div>

            {/* Notarial */}
            <div className="mt-2 text-[8px] border border-black p-2">
              <p>REPUBLIC OF THE PHILIPPINES ) S.S.</p>
              <p>PROVINCE OF SURIGAO DEL SUR )</p>
              <p>CITY/MUNICIPALITY OF _______________  )</p>
              <p className="mt-1">SUBSCRIBED AND SWORN TO before me this ______ day of ____________, __________ in the Municipality of ________, Surigao del Sur, affiant exhibited to me his/her Community Tax No. ________________, issued at ________________, on _____________________________.</p>
              <div className="grid grid-cols-2 mt-2 gap-2">
                <div>
                  <p>Doc. No. ___________</p>
                  <p>Page No. ___________</p>
                  <p>Book No. ___________</p>
                  <p>Series of ___________</p>
                </div>
                <div className="text-center">
                  <div className="mt-4 border-t border-black pt-1">
                    <p className="font-bold">EnP JUBERT D. TUTOR</p>
                    <p>Municipal Planning and Development Coordinator</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </TabsContent>

        {/* FORM 2 */}
        <TabsContent value="form2">
          <div className="printable-form">
          <div id="form2" className="bg-white text-black border border-gray-300 p-6 font-serif print:border-none" style={{ fontFamily: "Times New Roman, serif" }}>
            {/* Header */}
            <div className="text-center mb-3">
              <p className="text-[9px]">Republic of the Philippines</p>
              <p className="text-[9px]">Province of Surigao del Sur</p>
              <p className="text-[11px] font-bold">MUNICIPALITY OF TAGO</p>
              <p className="text-[9px] mt-1">OFFICE OF THE ZONING ADMINISTRATOR</p>
              <div className="border-t-2 border-b-2 border-black py-1 my-2">
                <p className="text-[13px] font-bold tracking-widest">DECISION ON ZONING</p>
              </div>
            </div>

            {/* App / Decision numbers */}
            <div className="grid grid-cols-2 gap-0 text-[9px] mb-1">
              <div className="border border-black p-1">
                <span className="font-bold">Application No:</span> {appNo}
              </div>
              <div className="border border-black p-1">
                <span className="font-bold">Decision No:</span> {decisionNo}
              </div>
              <div className="border border-black p-1">
                <span className="font-bold">Date Received:</span> {fmtDate(record.created_at)}
              </div>
              <div className="border border-black p-1">
                <span className="font-bold">Date of Issued:</span> {fmtDate(record.date_issued)}
              </div>
            </div>

            {/* Applicant */}
            <div className="grid grid-cols-2 gap-0 text-[9px] mb-1">
              <div className="border border-black p-1">
                <div className="font-bold">Applicant</div>
                <div className="border-b border-black min-h-[16px]">{record.owner_name}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold">Name of Corporation</div>
                <div className="border-b border-black min-h-[16px]">{record.corporation_name ?? ""}</div>
              </div>
              <div className="border border-black p-1 col-span-2">
                <div className="font-bold">Address</div>
                <div className="border-b border-black min-h-[16px]">{record.address}</div>
              </div>
            </div>

            {/* Project + Decision */}
            <div className="grid grid-cols-2 gap-0 text-[9px] mb-1">
              <div className="border border-black p-1">
                <div className="font-bold">Type of Project</div>
                <div className="border-b border-black min-h-[16px]">{record.project_type ?? ""}</div>
                <div className="min-h-[16px] mt-1">{record.project_nature ?? ""}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold">Area &amp; Location</div>
                <div className="border-b border-black min-h-[16px]">{record.land_area ? `${fmtNum(record.land_area)} sq.m.` : ""}</div>
                <div className="min-h-[16px] mt-1">{record.barangay}{record.address ? `, ${record.address}` : ""}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold">Decision</div>
                <div className={`text-[12px] font-bold mt-1 ${record.status === "approved" ? "text-green-700" : record.status === "rejected" ? "text-red-700" : "text-yellow-700"}`}>
                  {record.status.replace(/_/g, " ").toUpperCase()}
                </div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold">Right Over Land</div>
                <div className="border-b border-black min-h-[16px]">{record.right_over_land ?? ""}</div>
              </div>
            </div>

            {/* Conditions */}
            <div className="border border-black p-2 text-[8px] mb-3">
              <p className="font-bold mb-1">Conditions:</p>
              {[
                "All conditions stipulated herein form part of this decision are subject to monitoring.",
                "Non-compliance therewith shall be a cause for cancellation or legal action.",
                "The applicable requirements of government agencies and applicable provisions of existing laws shall be complied with.",
                "No activity other than that applied for shall be conducted within the project site.",
                "No major expansion, alteration and/or improvement shall be introduced without prior clearance from this office.",
                "This decision shall not be construed as a certification of LGU as to ownership by the applicant of the parcel of land subject of this decision.",
                "Any misinterpretation, false statements or allegations materials to the issuance of this decision shall be sufficient cause of its revocation.",
                "Provisions as to setbacks, yard requirements, bulk easement, area height and other restrictions shall strictly conform with the requirements of the National Building Code and other related laws.",
                "This decision shall be considered automatically revoked if the project is not commenced within one (1) year from the date of issue of this decision.",
                "For other conditions, please see the reverse side.",
              ].map((c, i) => (
                <div key={i} className="flex gap-1 mb-0.5">
                  <span className="border border-black w-3 h-3 flex-shrink-0 flex items-center justify-center text-[7px] mt-0.5">✓</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div className="text-center text-[9px] mb-3">
              <div className="inline-block text-left">
                <div className="mt-6 border-t border-black pt-1">
                  <p className="font-bold">EnP JUBERT D. TUTOR</p>
                  <p>Municipal Planning &amp; Dev't. Coordinator</p>
                </div>
              </div>
            </div>

            {/* LC / OR / Amount */}
            <div className="border-t-2 border-black pt-2 grid grid-cols-3 gap-2 text-[9px]">
              <div>
                <span className="font-bold">LC No.:</span> {appNo}
              </div>
              <div>
                <span className="font-bold">O.R. No.:</span> {record.or_no ?? "___________"}
              </div>
              <div>
                <span className="font-bold">Date Issued:</span> {fmtDate(record.date_issued)}
              </div>
              <div>
                <span className="font-bold">Amount Paid:</span> {record.amount_paid ? `₱${fmtNum(record.amount_paid)}` : "₱ ___________"}
              </div>
            </div>
          </div>
          </div>
        </TabsContent>
      </Tabs>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-form, .printable-form * {
            visibility: visible !important;
          }
          .printable-form {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          @page {
            size: 8.5in 13in;
            margin: 0.5in;
          }
          .no-print { display: none !important; }
          #form1, #form2 { page-break-after: always; }
        }
      `}</style>
    </div>
  );
}
