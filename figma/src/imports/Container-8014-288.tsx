import svgPaths from "./svg-x1jg7kta7l";
import imgImageIndusPod from "figma:asset/4487ba8a92fba78eeb5ef7fd5507fedb5836a873.png";

function Heading() {
  return (
    <div className="h-[25px] relative shrink-0 w-[128px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[36px] not-italic relative shrink-0 text-[#0f172b] text-[16px] tracking-[-0.3545px]">IndusPod</p>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p32ddfd00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.68333" />
        </g>
      </svg>
    </div>
  );
}

function Container() {
  return (
    <div className="bg-[#2b7fff] relative rounded-[16777200px] shrink-0 size-[24px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between relative size-full">
        <Heading />
        <Container />
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[48px] relative shrink-0 w-full" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <p className="absolute css-4hzbpn font-['Inter:Regular',sans-serif] font-normal leading-[24px] left-[-0.24px] not-italic text-[#62748e] text-[14px] top-[0.52px] tracking-[-0.2344px] w-[297px]">Industrial minimalism with exposed steel and panoramic glazing.</p>
      </div>
    </div>
  );
}

function Text() {
  return (
    <div className="bg-[#f1f5f9] h-[24px] relative rounded-[16777200px] shrink-0 w-[108px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[12px] py-[10px] relative size-full">
        <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] not-italic relative shrink-0 text-[#62748e] text-[10px] tracking-[1.3172px] uppercase">Clean Lines</p>
      </div>
    </div>
  );
}

function Text1() {
  return (
    <div className="bg-[#f1f5f9] h-[24px] relative rounded-[16777200px] shrink-0 w-[145px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[16px] py-[10px] relative size-full">
        <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] not-italic relative shrink-0 text-[#62748e] text-[10px] tracking-[1.3172px] uppercase">Modern Minimal</p>
      </div>
    </div>
  );
}

function Text2() {
  return (
    <div className="bg-[#f1f5f9] h-[24px] relative rounded-[16777200px] shrink-0 w-[169px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[16px] py-[10px] relative size-full">
        <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] not-italic relative shrink-0 text-[#62748e] text-[10px] tracking-[1.3172px] uppercase">Explicit Structure</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8.08px] items-start overflow-clip relative rounded-[inherit] size-full">
        <Text />
        <Text1 />
        <Text2 />
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[24px] h-[192px] items-start left-0 p-[24px] top-[193px] w-[348px]" data-name="Container">
      <Container1 />
      <Paragraph />
      <Container2 />
    </div>
  );
}

function ImageIndusPod() {
  return (
    <div className="h-[229px] relative shrink-0 w-full" data-name="Image (IndusPod)">
      <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={imgImageIndusPod} />
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute bg-[#f1f5f9] content-stretch flex flex-col h-[210px] items-start left-0 overflow-clip top-[-17px] w-[348px]" data-name="Container">
      <ImageIndusPod />
    </div>
  );
}

export default function Container5() {
  return (
    <div className="bg-white border-2 border-[#2b7fff] border-solid overflow-clip relative rounded-[40px] shadow-[0px_0px_0px_1px_rgba(43,127,255,0.1),0px_25px_50px_-12px_rgba(0,0,0,0.25)] size-full" data-name="Container">
      <Container3 />
      <Container4 />
    </div>
  );
}