import svgPaths from "./svg-vd6p9v48kp";
import imgInteriorStudio from "figma:asset/3610c0afd293f6c7507a7e451537d8fa9a25f712.png";
import imgImageXhomes from "figma:asset/6accee289b9f5f1a3ea5e8c6eb2df55c3626184b.png";

function InteriorStudio() {
  return (
    <div className="absolute h-[847px] left-0 top-0 w-[1111px]" data-name="InteriorStudio">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgInteriorStudio} />
    </div>
  );
}

function InteriorStudio1() {
  return <div className="absolute bg-gradient-to-t from-[rgba(15,23,43,0.4)] h-[847px] left-0 opacity-60 to-[rgba(0,0,0,0)] top-0 via-1/2 via-[rgba(0,0,0,0)] w-[1111px]" data-name="InteriorStudio" />;
}

function Container() {
  return (
    <div className="absolute h-[847px] left-0 top-0 w-[1111px]" data-name="Container">
      <InteriorStudio />
      <InteriorStudio1 />
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute left-[17px] size-[16px] top-[9px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p203476e0} id="Vector" stroke="var(--stroke-0, #314158)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M12.6667 8H3.33333" id="Vector_2" stroke="var(--stroke-0, #314158)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[rgba(255,255,255,0.9)] h-[34px] relative rounded-[10px] shrink-0 w-[162.477px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(226,232,240,0.5)] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon />
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-[93px] not-italic text-[#314158] text-[12px] text-center top-[10px] tracking-[0.6px] translate-x-[-50%] uppercase">Exterior View</p>
      </div>
    </div>
  );
}

function Container1() {
  return <div className="bg-[#00d492] opacity-83 rounded-[16777200px] shrink-0 size-[8px]" data-name="Container" />;
}

function Text() {
  return (
    <div className="flex-[1_0_0] h-[16px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[12px] text-white top-px tracking-[1.2px] uppercase w-[122px]">Viewing: living</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="bg-[rgba(15,23,43,0.8)] h-[34px] relative rounded-[16777200px] shrink-0 w-[179.258px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center px-[21px] py-px relative size-full">
        <Container1 />
        <Text />
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute content-stretch flex gap-[275px] h-[90px] items-start left-0 pb-0 pt-[24px] px-[24px] top-0 w-[1111px]" data-name="Container">
      <Button />
      <Container2 />
    </div>
  );
}

function Icon1() {
  return (
    <div className="absolute left-[21px] size-[16.8px] top-[12.6px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.8 16.8">
        <g clipPath="url(#clip0_8025_972)" id="Icon">
          <path d={svgPaths.p4ed6900} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
          <path d={svgPaths.p1bec100} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
          <path d="M2.8 12.6V14" id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
          <path d="M14 12.6V14" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
          <path d="M8.39999 2.8V9.09999" id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        </g>
        <defs>
          <clipPath id="clip0_8025_972">
            <rect fill="white" height="16.8" width="16.8" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="absolute bg-[#155dfc] h-[42px] left-[3.27px] rounded-[14px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] top-[5px] w-[114.844px]" data-name="Button">
      <Icon1 />
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-[70.2px] not-italic text-[12px] text-center text-white top-[13.65px] tracking-[0.6px] translate-x-[-50%] uppercase">Living</p>
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute left-[20px] size-[16px] top-[12px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p140b0380} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M4.66667 1.33333V14.6667" id="Vector_2" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p3fcd0100} id="Vector_3" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="absolute h-[40px] left-[119.38px] rounded-[14px] top-[6px] w-[123.141px]" data-name="Button">
      <Icon2 />
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-[74px] not-italic text-[#62748e] text-[12px] text-center top-[13px] tracking-[0.6px] translate-x-[-50%] uppercase">Kitchen</p>
    </div>
  );
}

function Icon3() {
  return (
    <div className="absolute left-[20px] size-[16px] top-[12px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p26183600} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p5256b00} id="Vector_2" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 2.66667V6.66667" id="Vector_3" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M1.33333 12H14.6667" id="Vector_4" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="absolute h-[40px] left-[246.52px] rounded-[14px] top-[6px] w-[131.055px]" data-name="Button">
      <Icon3 />
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-[78px] not-italic text-[#62748e] text-[12px] text-center top-[13px] tracking-[0.6px] translate-x-[-50%] uppercase">Bedroom</p>
    </div>
  );
}

function Icon4() {
  return (
    <div className="absolute left-[20px] size-[16px] top-[12px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M6.66667 2.66667L5.33333 4" id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M11.3333 12.6667V14" id="Vector_2" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M1.33333 8H14.6667" id="Vector_3" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M4.66667 12.6667V14" id="Vector_4" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p2f762600} id="Vector_5" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button4() {
  return (
    <div className="absolute h-[40px] left-[381.57px] rounded-[14px] top-[6px] w-[99.922px]" data-name="Button">
      <Icon4 />
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-[62.5px] not-italic text-[#62748e] text-[12px] text-center top-[13px] tracking-[0.6px] translate-x-[-50%] uppercase">Bath</p>
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute bg-white border border-[#e2e8f0] border-solid h-[54px] left-[310.75px] rounded-[16px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] top-0 w-[489.492px]" data-name="Container">
      <Button1 />
      <Button2 />
      <Button3 />
      <Button4 />
    </div>
  );
}

function Container5() {
  return (
    <div className="h-[15px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[60.33px] not-italic text-[#90a1b9] text-[10px] text-center top-[0.5px] tracking-[1.1172px] translate-x-[-50%] uppercase">Plan Map</p>
    </div>
  );
}

function Icon5() {
  return (
    <div className="h-[80px] overflow-clip relative shadow-[0px_1px_4px_0px_rgba(0,0,0,0.15)] shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-[5%_40%_5%_0]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 72 72">
          <path d={svgPaths.p175c3500} fill="var(--fill-0, #2563EB)" id="Vector" />
        </svg>
      </div>
      <div className="absolute inset-[5%_0_38%_62%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 45.6 45.6">
          <path d={svgPaths.p1a7eaf00} fill="var(--fill-0, #CBD5E1)" id="Vector" />
        </svg>
      </div>
      <div className="absolute inset-[65%_0_5%_62%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 45.6 24">
          <path d={svgPaths.p15b69500} fill="var(--fill-0, #CBD5E1)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.95)] content-stretch flex flex-col gap-[8px] h-[129px] items-start left-[933px] pb-px pt-[13px] px-[13px] rounded-[14px] top-[-75px] w-[146px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" />
      <Container5 />
      <Icon5 />
    </div>
  );
}

function Container7() {
  return (
    <div className="absolute h-[54px] left-0 top-[761px] w-[1111px]" data-name="Container">
      <Container4 />
      <Container6 />
    </div>
  );
}

function Container8() {
  return (
    <div className="absolute bg-[#e2e8f0] h-[847px] left-0 overflow-clip top-0 w-[1111px]" data-name="Container">
      <Container />
      <Container3 />
      <Container7 />
    </div>
  );
}

function Heading() {
  return (
    <div className="h-[28px] relative shrink-0 w-[134.688px]" data-name="Heading 2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-0 not-italic text-[#0f172b] text-[20px] top-0 tracking-[-0.4492px]">Interior Studio</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-[113px] not-italic text-[#90a1b9] text-[12px] text-right top-px tracking-[0.6px] translate-x-[-100%] uppercase">Total Estimate</p>
    </div>
  );
}

function Container10() {
  return (
    <div className="h-[28px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-[113.42px] not-italic text-[#0f172b] text-[18px] text-right top-0 tracking-[-0.4395px] translate-x-[-100%] w-[84px]">$201,500</p>
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[44px] relative shrink-0 w-[112.672px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container9 />
        <Container10 />
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex h-[44px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Heading />
      <Container11 />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-0 not-italic text-[#62748e] text-[14px] top-[0.5px] tracking-[-0.1504px]">Configure your finishes and furnishing packages.</p>
    </div>
  );
}

function Container13() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col gap-[4px] h-[117px] items-start left-[1112px] pb-px pt-[24px] px-[32px] top-0 w-[439px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#f1f5f9] border-b border-solid inset-0 pointer-events-none" />
      <Container12 />
      <Paragraph />
    </div>
  );
}

function Container14() {
  return (
    <div className="bg-[#0f172b] relative rounded-[16777200px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 size-[32px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] not-italic relative shrink-0 text-[14px] text-white tracking-[-0.1504px]">1</p>
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Heading 3">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#0f172b] text-[14px] top-[0.5px] tracking-[0.1996px] uppercase">Base Finishes</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="bg-[#ecfdf5] h-[19px] relative rounded-[4px] shrink-0 w-full" data-name="Paragraph">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[8px] not-italic text-[#096] text-[10px] top-[2.5px] tracking-[0.1172px]">REQUIRED FOR PERMITTING</p>
    </div>
  );
}

function Container15() {
  return (
    <div className="h-[44px] relative shrink-0 w-[160.922px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[5px] items-start relative size-full">
        <Heading1 />
        <Paragraph1 />
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[44px] items-center left-0 top-0 w-[375px]" data-name="Container">
      <Container14 />
      <Container15 />
    </div>
  );
}

function Label() {
  return (
    <div className="h-[16px] relative shrink-0 w-[68.25px]" data-name="Label">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px tracking-[0.6px] uppercase">Flooring</p>
      </div>
    </div>
  );
}

function Text1() {
  return (
    <div className="h-[16px] relative shrink-0 w-[49.805px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[#0f172b] text-[12px] top-px">LVP Oak</p>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex h-[16px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Label />
      <Text1 />
    </div>
  );
}

function Container18() {
  return (
    <div className="bg-[#e3d9c6] relative rounded-[10px] shrink-0 size-[40px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container19() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#0f172b] text-[14px] top-[0.5px] tracking-[-0.1504px]">LVP Oak</p>
    </div>
  );
}

function Container20() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px">Included</p>
    </div>
  );
}

function Container21() {
  return (
    <div className="flex-[1_0_0] h-[36px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container19 />
        <Container20 />
      </div>
    </div>
  );
}

function Icon6() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_8025_962)" id="Icon">
          <path d={svgPaths.p14d24500} id="Vector" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p3e012060} id="Vector_2" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
        <defs>
          <clipPath id="clip0_8025_962">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button5() {
  return (
    <div className="bg-[#f8fafc] col-[1] css-por8k5 relative rounded-[14px] row-[1] self-stretch shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#0f172b] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[14px] py-[2px] relative size-full">
          <Container18 />
          <Container21 />
          <Icon6 />
        </div>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="bg-[#9ca3af] relative rounded-[10px] shrink-0 size-[40px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container23() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#0f172b] text-[14px] top-[0.5px] tracking-[-0.1504px]">Polished Concrete</p>
    </div>
  );
}

function Container24() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px">+$1,200</p>
    </div>
  );
}

function Container25() {
  return (
    <div className="flex-[1_0_0] h-[36px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container23 />
        <Container24 />
      </div>
    </div>
  );
}

function Button6() {
  return (
    <div className="col-[1] css-por8k5 relative rounded-[14px] row-[2] self-stretch shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[14px] py-[2px] relative size-full">
          <Container22 />
          <Container25 />
        </div>
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="bg-[#5d4037] relative rounded-[10px] shrink-0 size-[40px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container27() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#0f172b] text-[14px] top-[0.5px] tracking-[-0.1504px]">Eng. Walnut</p>
    </div>
  );
}

function Container28() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px">+$2,400</p>
    </div>
  );
}

function Container29() {
  return (
    <div className="flex-[1_0_0] h-[36px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container27 />
        <Container28 />
      </div>
    </div>
  );
}

function Button7() {
  return (
    <div className="col-[1] css-por8k5 relative rounded-[14px] row-[3] self-stretch shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[14px] py-[2px] relative size-full">
          <Container26 />
          <Container29 />
        </div>
      </div>
    </div>
  );
}

function Container30() {
  return (
    <div className="gap-[8px] grid grid-cols-[repeat(1,_minmax(0,_1fr))] grid-rows-[repeat(3,_minmax(0,_1fr))] h-[220px] relative shrink-0 w-full" data-name="Container">
      <Button5 />
      <Button6 />
      <Button7 />
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[248px] items-start relative shrink-0 w-full" data-name="Container">
      <Container17 />
      <Container30 />
    </div>
  );
}

function Label1() {
  return (
    <div className="h-[16px] relative shrink-0 w-[129.906px]" data-name="Label">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px tracking-[0.6px] uppercase">Kitchen Cabinets</p>
      </div>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-[16px] relative shrink-0 w-[73.453px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[#0f172b] text-[12px] top-px">Matte White</p>
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex h-[16px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Label1 />
      <Text2 />
    </div>
  );
}

function Container33() {
  return (
    <div className="bg-[#f1f5f9] relative rounded-[10px] shrink-0 size-[40px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container34() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#0f172b] text-[14px] top-[0.5px] tracking-[-0.1504px]">Matte White</p>
    </div>
  );
}

function Container35() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px">Included</p>
    </div>
  );
}

function Container36() {
  return (
    <div className="flex-[1_0_0] h-[36px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container34 />
        <Container35 />
      </div>
    </div>
  );
}

function Icon7() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_8025_962)" id="Icon">
          <path d={svgPaths.p14d24500} id="Vector" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p3e012060} id="Vector_2" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
        <defs>
          <clipPath id="clip0_8025_962">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button8() {
  return (
    <div className="bg-[#f8fafc] col-[1] css-por8k5 relative rounded-[14px] row-[1] self-stretch shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#0f172b] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[14px] py-[2px] relative size-full">
          <Container33 />
          <Container36 />
          <Icon7 />
        </div>
      </div>
    </div>
  );
}

function Container37() {
  return (
    <div className="bg-[#e3d9c6] relative rounded-[10px] shrink-0 size-[40px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container38() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#0f172b] text-[14px] top-[0.5px] tracking-[-0.1504px]">Light Ash</p>
    </div>
  );
}

function Container39() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px">Included</p>
    </div>
  );
}

function Container40() {
  return (
    <div className="flex-[1_0_0] h-[36px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container38 />
        <Container39 />
      </div>
    </div>
  );
}

function Button9() {
  return (
    <div className="col-[1] css-por8k5 relative rounded-[14px] row-[2] self-stretch shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[14px] py-[2px] relative size-full">
          <Container37 />
          <Container40 />
        </div>
      </div>
    </div>
  );
}

function Container41() {
  return (
    <div className="bg-[#1e3a8a] relative rounded-[10px] shrink-0 size-[40px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container42() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#0f172b] text-[14px] top-[0.5px] tracking-[-0.1504px]">Midnight Blue</p>
    </div>
  );
}

function Container43() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px">+$1,500</p>
    </div>
  );
}

function Container44() {
  return (
    <div className="flex-[1_0_0] h-[36px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container42 />
        <Container43 />
      </div>
    </div>
  );
}

function Button10() {
  return (
    <div className="col-[1] css-por8k5 relative rounded-[14px] row-[3] self-stretch shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[14px] py-[2px] relative size-full">
          <Container41 />
          <Container44 />
        </div>
      </div>
    </div>
  );
}

function Container45() {
  return (
    <div className="gap-[8px] grid grid-cols-[repeat(1,_minmax(0,_1fr))] grid-rows-[repeat(3,_minmax(0,_1fr))] h-[220px] relative shrink-0 w-full" data-name="Container">
      <Button8 />
      <Button9 />
      <Button10 />
    </div>
  );
}

function Container46() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[248px] items-start relative shrink-0 w-full" data-name="Container">
      <Container32 />
      <Container45 />
    </div>
  );
}

function Container47() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[24px] h-[544px] items-start left-[16px] pl-[18px] pr-0 py-0 top-[68px] w-[359px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#f1f5f9] border-l-2 border-solid inset-0 pointer-events-none" />
      <Container31 />
      <Container46 />
    </div>
  );
}

function Section() {
  return (
    <div className="h-[612px] relative shrink-0 w-full" data-name="Section">
      <Container16 />
      <Container47 />
    </div>
  );
}

function Container48() {
  return (
    <div className="bg-[#f1f5f9] relative rounded-[16777200px] shrink-0 size-[32px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] not-italic relative shrink-0 text-[#62748e] text-[14px] tracking-[-0.1504px]">2</p>
      </div>
    </div>
  );
}

function Heading3() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Heading 3">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#0f172b] text-[14px] top-[0.5px] tracking-[0.1996px] uppercase">Furniture Package</p>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="h-[15px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-0 not-italic text-[#90a1b9] text-[10px] top-[0.5px] tracking-[0.1172px] uppercase">OPTIONAL · MOVABLE</p>
    </div>
  );
}

function Container49() {
  return (
    <div className="h-[39px] relative shrink-0 w-[157.297px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
        <Heading3 />
        <Paragraph2 />
      </div>
    </div>
  );
}

function Container50() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[39px] items-center left-0 top-0 w-[375px]" data-name="Container">
      <Container48 />
      <Container49 />
    </div>
  );
}

function Icon8() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[16px]" data-name="Icon">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <div className="absolute bottom-[8.33%] left-1/2 right-1/2 top-[8.33%]" data-name="Vector">
          <div className="absolute inset-[-5%_-0.67px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.33333 14.6667">
              <path d="M0.666667 0.666667V14" id="Vector" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-[20.83%] left-1/4 right-1/4 top-[20.83%]" data-name="Vector">
          <div className="absolute inset-[-7.14%_-8.33%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.33333 10.6667">
              <path d={svgPaths.p199d2ac8} id="Vector" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Text3() {
  return (
    <div className="h-[15px] relative shrink-0 w-[42.164px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[21.5px] not-italic text-[#0f172b] text-[10px] text-center top-[0.5px] tracking-[0.3672px] translate-x-[-50%] uppercase">Rental</p>
      </div>
    </div>
  );
}

function Button11() {
  return (
    <div className="bg-white flex-[1_0_0] h-[51px] min-h-px min-w-px relative rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center px-0 py-[8px] relative size-full">
        <Icon8 />
        <Text3 />
      </div>
    </div>
  );
}

function Icon9() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[16px]" data-name="Icon">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <div className="absolute inset-[62.5%_33.33%_12.5%_8.33%]" data-name="Vector">
          <div className="absolute inset-[-16.67%_-7.14%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 5.33333">
              <path d={svgPaths.p352c6500} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[13.03%_20.85%_54.7%_66.67%]" data-name="Vector">
          <div className="absolute inset-[-12.92%_-33.38%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3.33096 6.49632">
              <path d={svgPaths.p39a2ea10} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[63.04%_8.33%_12.5%_79.17%]" data-name="Vector">
          <div className="absolute inset-[-17.04%_-33.33%_-17.04%_-33.34%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3.3335 5.24683">
              <path d={svgPaths.p234883c0} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[12.5%_45.83%_54.17%_20.83%]" data-name="Vector">
          <div className="absolute inset-[-12.5%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6.66667 6.66667">
              <path d={svgPaths.p31080000} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Text4() {
  return (
    <div className="h-[15px] relative shrink-0 w-[37.047px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[19px] not-italic text-[#62748e] text-[10px] text-center top-[0.5px] tracking-[0.3672px] translate-x-[-50%] uppercase">Family</p>
      </div>
    </div>
  );
}

function Button12() {
  return (
    <div className="flex-[1_0_0] h-[51px] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center px-0 py-[8px] relative size-full">
        <Icon9 />
        <Text4 />
      </div>
    </div>
  );
}

function Icon10() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[16px]" data-name="Icon">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <div className="absolute inset-[8.33%_33.33%_16.67%_33.33%]" data-name="Vector">
          <div className="absolute inset-[-5.56%_-12.5%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6.66667 13.3333">
              <path d={svgPaths.p27fd8a00} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-[16.67%] left-[8.33%] right-[8.33%] top-1/4" data-name="Vector">
          <div className="absolute inset-[-7.14%_-5%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14.6667 10.6667">
              <path d={svgPaths.pb5eef70} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Text5() {
  return (
    <div className="h-[15px] relative shrink-0 w-[31.695px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[16.5px] not-italic text-[#62748e] text-[10px] text-center top-[0.5px] tracking-[0.3672px] translate-x-[-50%] uppercase">Work</p>
      </div>
    </div>
  );
}

function Button13() {
  return (
    <div className="flex-[1_0_0] h-[51px] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center px-0 py-[8px] relative size-full">
        <Icon10 />
        <Text5 />
      </div>
    </div>
  );
}

function Icon11() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[16px]" data-name="Icon">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <div className="absolute inset-[62.5%_20.83%_12.5%_20.83%]" data-name="Vector">
          <div className="absolute inset-[-16.67%_-7.14%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 5.33333">
              <path d={svgPaths.p352c6500} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[12.5%_33.33%_54.17%_33.33%]" data-name="Vector">
          <div className="absolute inset-[-12.5%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6.66667 6.66667">
              <path d={svgPaths.p31080000} id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[15px] relative shrink-0 w-[55.711px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[15px] left-[28px] not-italic text-[#62748e] text-[10px] text-center top-[0.5px] tracking-[0.3672px] translate-x-[-50%] uppercase">Personal</p>
      </div>
    </div>
  );
}

function Button14() {
  return (
    <div className="flex-[1_0_0] h-[51px] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center px-0 py-[8px] relative size-full">
        <Icon11 />
        <Text6 />
      </div>
    </div>
  );
}

function Container51() {
  return (
    <div className="bg-[#f1f5f9] h-[59px] relative rounded-[10px] shrink-0 w-full" data-name="Container">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[8px] items-start pb-0 pt-[4px] px-[4px] relative size-full">
          <Button11 />
          <Button12 />
          <Button13 />
          <Button14 />
        </div>
      </div>
    </div>
  );
}

function Text7() {
  return (
    <div className="h-[24px] relative shrink-0 w-[96.227px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[24px] left-0 not-italic text-[#0f172b] text-[16px] top-[-0.5px] tracking-[-0.3125px]">Unfurnished</p>
      </div>
    </div>
  );
}

function Text8() {
  return (
    <div className="h-[16px] relative shrink-0 w-[52.313px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[#096] text-[12px] top-px">Included</p>
      </div>
    </div>
  );
}

function Container52() {
  return (
    <div className="absolute content-stretch flex h-[24px] items-center justify-between left-[18px] top-[18px] w-[305px]" data-name="Container">
      <Text7 />
      <Text8 />
    </div>
  );
}

function Button15() {
  return (
    <div className="bg-[#f8fafc] h-[60px] relative rounded-[14px] shrink-0 w-full" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#90a1b9] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container52 />
    </div>
  );
}

function Heading2() {
  return (
    <div className="h-[24px] relative shrink-0 w-[117.094px]" data-name="Heading 4">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[24px] left-0 not-italic text-[#0f172b] text-[16px] top-[-0.5px] tracking-[-0.3125px]">Durability Pack</p>
      </div>
    </div>
  );
}

function Text9() {
  return (
    <div className="h-[20px] relative shrink-0 w-[60.031px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#155dfc] text-[14px] top-[0.5px] tracking-[-0.1504px] w-[61px]">+$4,500</p>
      </div>
    </div>
  );
}

function Container53() {
  return (
    <div className="content-stretch flex h-[24px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Heading2 />
      <Text9 />
    </div>
  );
}

function Text10() {
  return (
    <div className="absolute bg-[#f1f5f9] h-[19px] left-0 rounded-[4px] top-0 w-[119.289px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[8px] not-italic text-[#45556c] text-[10px] top-[2.5px] tracking-[0.1172px]">Stain-resistant Sofa</p>
    </div>
  );
}

function Text11() {
  return (
    <div className="absolute bg-[#f1f5f9] h-[19px] left-[125.29px] rounded-[4px] top-0 w-[101.891px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[8px] not-italic text-[#45556c] text-[10px] top-[2.5px] tracking-[0.1172px]">Metal Bed Frame</p>
    </div>
  );
}

function Text12() {
  return (
    <div className="absolute bg-[#f1f5f9] h-[19px] left-0 rounded-[4px] top-[25px] w-[97.789px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[8px] not-italic text-[#45556c] text-[10px] top-[2.5px] tracking-[0.1172px]">Compact Dining</p>
    </div>
  );
}

function Container54() {
  return (
    <div className="h-[44px] relative shrink-0 w-full" data-name="Container">
      <Text10 />
      <Text11 />
      <Text12 />
    </div>
  );
}

function Button16() {
  return (
    <div className="bg-white col-[1] css-por8k5 relative rounded-[14px] row-[1] self-stretch shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#f1f5f9] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col gap-[8px] items-start pb-[2px] pt-[18px] px-[18px] relative size-full">
        <Container53 />
        <Container54 />
      </div>
    </div>
  );
}

function Heading4() {
  return (
    <div className="h-[24px] relative shrink-0 w-[127.195px]" data-name="Heading 4">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[24px] left-0 not-italic text-[#0f172b] text-[16px] top-[-0.5px] tracking-[-0.3125px]">Investor Staging</p>
      </div>
    </div>
  );
}

function Text13() {
  return (
    <div className="h-[20px] relative shrink-0 w-[59.469px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[#155dfc] text-[14px] top-[0.5px] tracking-[-0.1504px] w-[60px]">+$3,200</p>
      </div>
    </div>
  );
}

function Container55() {
  return (
    <div className="content-stretch flex h-[24px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Heading4 />
      <Text13 />
    </div>
  );
}

function Text14() {
  return (
    <div className="absolute bg-[#f1f5f9] h-[19px] left-0 rounded-[4px] top-0 w-[69.75px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[8px] not-italic text-[#45556c] text-[10px] top-[2.5px] tracking-[0.1172px]">Basic Sofa</p>
    </div>
  );
}

function Text15() {
  return (
    <div className="absolute bg-[#f1f5f9] h-[19px] left-[75.75px] rounded-[4px] top-0 w-[71.531px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[8px] not-italic text-[#45556c] text-[10px] top-[2.5px] tracking-[0.1172px]">Queen Bed</p>
    </div>
  );
}

function Text16() {
  return (
    <div className="absolute bg-[#f1f5f9] h-[19px] left-[153.28px] rounded-[4px] top-0 w-[66.43px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[8px] not-italic text-[#45556c] text-[10px] top-[2.5px] tracking-[0.1172px]">Decor Set</p>
    </div>
  );
}

function Container56() {
  return (
    <div className="h-[19px] relative shrink-0 w-full" data-name="Container">
      <Text14 />
      <Text15 />
      <Text16 />
    </div>
  );
}

function Button17() {
  return (
    <div className="bg-white col-[1] css-por8k5 relative rounded-[14px] row-[2] self-stretch shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#f1f5f9] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col gap-[8px] items-start pb-[2px] pt-[18px] px-[18px] relative size-full">
        <Container55 />
        <Container56 />
      </div>
    </div>
  );
}

function Container57() {
  return (
    <div className="gap-[12px] grid grid-cols-[repeat(1,_minmax(0,_1fr))] grid-rows-[__minmax(0,_112fr)_minmax(0,_1fr)] h-[211px] relative shrink-0 w-full" data-name="Container">
      <Button16 />
      <Button17 />
    </div>
  );
}

function Container58() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[16px] h-[370px] items-start left-[16px] pl-[18px] pr-0 py-0 top-[63px] w-[359px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#f1f5f9] border-l-2 border-solid inset-0 pointer-events-none" />
      <Container51 />
      <Button15 />
      <Container57 />
    </div>
  );
}

function Section1() {
  return (
    <div className="h-[433px] relative shrink-0 w-full" data-name="Section">
      <Container50 />
      <Container58 />
    </div>
  );
}

function Container59() {
  return (
    <div className="h-[1149px] relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex flex-col gap-[40px] items-start pb-0 pt-[32px] px-[32px] relative size-full">
        <Section />
        <Section1 />
      </div>
    </div>
  );
}

function Container60() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[439px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Container59 />
      </div>
    </div>
  );
}

function Icon12() {
  return (
    <div className="absolute left-[261.04px] size-[16px] top-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M6 12L10 8L6 4" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button18() {
  return (
    <div className="bg-[#0f172b] h-[56px] relative rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="Button">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[24px] left-[183.95px] not-italic text-[16px] text-center text-white top-[15.5px] tracking-[-0.3125px] translate-x-[-50%]">Confirm Selection</p>
      <Icon12 />
    </div>
  );
}

function Container61() {
  return (
    <div className="bg-white h-[105px] relative shrink-0 w-[439px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e2e8f0] border-solid border-t inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-0 pt-[25px] px-[24px] relative size-full">
        <Button18 />
      </div>
    </div>
  );
}

function Container62() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col h-[847px] items-start left-[1111px] pb-0 pl-px pr-0 pt-[117px] top-0 w-[440px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e2e8f0] border-l border-solid inset-0 pointer-events-none shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" />
      <Container60 />
      <Container61 />
    </div>
  );
}

function InteriorStudio2() {
  return (
    <div className="bg-[#f8fafc] h-[847px] overflow-clip relative shrink-0 w-full" data-name="InteriorStudio">
      <Container8 />
      <Container13 />
      <Container62 />
    </div>
  );
}

function Container63() {
  return (
    <div className="absolute bg-[#f1f5f9] content-stretch flex flex-col h-[847px] items-start left-0 top-[72px] w-[1551px]" data-name="Container">
      <InteriorStudio2 />
    </div>
  );
}

function DesignStudio() {
  return (
    <div className="absolute bg-[#f8fafc] h-[919px] left-0 overflow-clip top-0 w-[1551px]" data-name="DesignStudio">
      <Container63 />
    </div>
  );
}

function Text17() {
  return (
    <div className="absolute h-[18px] left-0 top-[-20000px] w-[21.633px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[18px] left-0 not-italic text-[#0a0a0a] text-[12px] top-px">$0k</p>
    </div>
  );
}

function ImageXhomes() {
  return (
    <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative" data-name="Image (XHOMES)">
      <img alt="" className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 max-w-none object-contain pointer-events-none size-full" src={imgImageXhomes} />
    </div>
  );
}

function Button19() {
  return (
    <div className="absolute content-stretch flex h-[24px] items-center left-[32px] top-[23.5px] w-[33.609px]" data-name="Button">
      <ImageXhomes />
    </div>
  );
}

function Icon13() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 10">
        <g id="Icon">
          <path d={svgPaths.p1098da98} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
        </g>
      </svg>
    </div>
  );
}

function Container64() {
  return (
    <div className="bg-[#0f172b] relative rounded-[16777200px] shrink-0 size-[16px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#0f172b] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center p-px relative size-full">
        <Icon13 />
      </div>
    </div>
  );
}

function Text18() {
  return (
    <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-[54px] not-italic text-[#62748e] text-[14px] text-center top-[0.5px] tracking-[-0.5004px] translate-x-[-50%]">{`Site & Feasibility`}</p>
      </div>
    </div>
  );
}

function Button20() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[68px] items-center left-0 top-0 w-[136.664px]" data-name="Button">
      <Container64 />
      <Text18 />
    </div>
  );
}

function Container65() {
  return <div className="bg-white rounded-[16777200px] shrink-0 size-[6px]" data-name="Container" />;
}

function Container66() {
  return (
    <div className="bg-[#0f172b] relative rounded-[16777200px] shrink-0 size-[16px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#0f172b] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center p-px relative size-full">
        <Container65 />
      </div>
    </div>
  );
}

function Text19() {
  return (
    <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-[23px] not-italic text-[#0f172b] text-[14px] text-center top-[0.5px] tracking-[-0.5004px] translate-x-[-50%]">Design</p>
      </div>
    </div>
  );
}

function Button21() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[68px] items-center left-[176.66px] top-0 w-[73.656px]" data-name="Button">
      <Container66 />
      <Text19 />
    </div>
  );
}

function Container67() {
  return (
    <div className="relative rounded-[16777200px] shrink-0 size-[16px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#cad5e2] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
    </div>
  );
}

function Text20() {
  return (
    <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-[48.5px] not-italic text-[#62748e] text-[14px] text-center top-[0.5px] tracking-[-0.5004px] translate-x-[-50%]">Value Strategy</p>
      </div>
    </div>
  );
}

function Button22() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[68px] items-center left-[290.32px] top-0 w-[124.414px]" data-name="Button">
      <Container67 />
      <Text20 />
    </div>
  );
}

function Container68() {
  return (
    <div className="relative rounded-[16777200px] shrink-0 size-[16px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#cad5e2] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
    </div>
  );
}

function Text21() {
  return (
    <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-[77.5px] not-italic text-[#62748e] text-[14px] text-center top-[0.5px] tracking-[-0.5004px] translate-x-[-50%]">{`Permitting & Incentives`}</p>
      </div>
    </div>
  );
}

function Button23() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[68px] items-center left-[454.73px] top-0 w-[181.133px]" data-name="Button">
      <Container68 />
      <Text21 />
    </div>
  );
}

function Container69() {
  return (
    <div className="relative rounded-[16777200px] shrink-0 size-[16px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#cad5e2] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
    </div>
  );
}

function Text22() {
  return (
    <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-[57.5px] not-italic text-[#62748e] text-[14px] text-center top-[0.5px] tracking-[-0.5004px] translate-x-[-50%]">Project Execution</p>
      </div>
    </div>
  );
}

function Button24() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[68px] items-center left-[675.87px] top-0 w-[142.742px]" data-name="Button">
      <Container69 />
      <Text22 />
    </div>
  );
}

function Navigation() {
  return (
    <div className="absolute h-[68px] left-[366.2px] top-[1.5px] w-[818.609px]" data-name="Navigation">
      <Button20 />
      <Button21 />
      <Button22 />
      <Button23 />
      <Button24 />
    </div>
  );
}

function Button25() {
  return (
    <div className="bg-white flex-[1_0_0] h-[23px] min-h-px min-w-px relative rounded-[4px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[14.5px] not-italic text-[#0f172b] text-[10px] text-center top-[4.5px] tracking-[0.1172px] translate-x-[-50%]">En</p>
      </div>
    </div>
  );
}

function Button26() {
  return (
    <div className="h-[23px] relative rounded-[4px] shrink-0 w-[26px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold','Noto_Sans_JP:Bold',sans-serif] font-bold leading-[15px] left-[13px] not-italic text-[#62748e] text-[10px] text-center top-[4.5px] tracking-[0.1172px] translate-x-[-50%]">中</p>
      </div>
    </div>
  );
}

function Container70() {
  return (
    <div className="bg-[#f1f5f9] flex-[1_0_0] h-[33px] min-h-px min-w-px relative rounded-[10px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[4px] items-start pb-px pt-[5px] px-[5px] relative size-full">
        <Button25 />
        <Button26 />
      </div>
    </div>
  );
}

function Container71() {
  return <div className="bg-[#e2e8f0] h-[24px] shrink-0 w-px" data-name="Container" />;
}

function Container72() {
  return (
    <div className="bg-[#0f172b] flex-[1_0_0] h-[36px] min-h-px min-w-px relative rounded-[16777200px] shadow-[0px_0px_0px_2px_white,0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] not-italic relative shrink-0 text-[12px] text-center text-white">AC</p>
      </div>
    </div>
  );
}

function Button27() {
  return (
    <div className="relative rounded-[16777200px] shrink-0 size-[46px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center px-[5px] py-px relative size-full">
        <Container72 />
      </div>
    </div>
  );
}

function Container73() {
  return (
    <div className="absolute content-stretch flex gap-[20px] h-[46px] items-center left-[1363.27px] top-[12.5px] w-[155.734px]" data-name="Container">
      <Container70 />
      <Container71 />
      <Button27 />
    </div>
  );
}

function GlobalHeader() {
  return (
    <div className="absolute bg-white border-[#e2e8f0] border-b border-solid h-[72px] left-0 top-0 w-[1551px]" data-name="GlobalHeader">
      <Button19 />
      <Navigation />
      <Container73 />
    </div>
  );
}

export default function Component2501132ndMeetingAdu() {
  return (
    <div className="bg-white relative size-full" data-name="250113_2nd Meeting_ADU">
      <DesignStudio />
      <Text17 />
      <GlobalHeader />
    </div>
  );
}