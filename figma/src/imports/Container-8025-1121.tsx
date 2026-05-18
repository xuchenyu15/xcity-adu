import svgPaths from "./svg-km872qscee";
import imgInteriorStudio from "figma:asset/3610c0afd293f6c7507a7e451537d8fa9a25f712.png";

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

export default function Container8() {
  return (
    <div className="bg-[#e2e8f0] relative size-full" data-name="Container">
      <Container />
      <Container3 />
      <Container7 />
    </div>
  );
}